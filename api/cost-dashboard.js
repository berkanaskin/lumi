/**
 * API Cost Dashboard Edge Function
 * Vercel Edge Function for admin-only API cost monitoring
 *
 * Provides metrics on:
 * - Embedding vs LLM call distribution
 * - Monthly costs with trend analysis
 * - Alerts for cost overages and high LLM ratio
 * - 7-day trend data for visualization
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const config = {
    runtime: 'edge',
};

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase() {
    try {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (!serviceAccountJson) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
        }

        const serviceAccount = JSON.parse(serviceAccountJson);
        const app = initializeApp({
            credential: cert(serviceAccount),
        });

        return {
            db: getFirestore(app),
            auth: getAuth(app),
        };
    } catch (error) {
        console.error('[CostDashboard] Firebase init error:', error.message);
        throw error;
    }
}

/**
 * Check if user is admin
 */
async function isAdmin(db, uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        return userData?.admin === true;
    } catch (error) {
        console.error('[CostDashboard] Admin check error:', error);
        return false;
    }
}

/**
 * Calculate daily LLM ratio for trend data
 */
async function calculateTrend(db) {
    try {
        const trend = [];
        const now = new Date();

        // Get metrics for last 7 days
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now);
            dayStart.setDate(dayStart.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);

            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const dayMetrics = await db
                .collection('api_metrics')
                .where('timestamp', '>=', dayStart)
                .where('timestamp', '<', dayEnd)
                .get();

            const embedding = dayMetrics.docs.filter(m => m.data().type === 'embedding').length;
            const llm = dayMetrics.docs.filter(m => m.data().type === 'llm').length;
            const total = embedding + llm;

            trend.push({
                date: dayStart.toISOString().split('T')[0],
                llmRatio: total > 0 ? llm / total : 0,
                calls: total,
            });
        }

        return trend;
    } catch (error) {
        console.error('[CostDashboard] Trend calculation error:', error);
        return [];
    }
}

/**
 * Main cost dashboard handler
 */
export default async function handler(request) {
    // Only allow GET requests
    if (request.method !== 'GET') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { 'Content-Type': 'application/json' } }
        );
    }

    try {
        // Extract Firebase ID token from Authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized: Missing or invalid token' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const token = authHeader.substring('Bearer '.length);

        // Initialize Firebase
        const { db, auth } = initializeFirebase();

        // Verify token and get user ID
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(token);
        } catch (error) {
            console.error('[CostDashboard] Token verification error:', error);
            return new Response(
                JSON.stringify({ error: 'Unauthorized: Invalid token' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Check admin status
        const userIsAdmin = await isAdmin(db, decodedToken.uid);
        if (!userIsAdmin) {
            return new Response(
                JSON.stringify({ error: 'Forbidden: Admin access required' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Calculate date range (current month)
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Query metrics from Firestore
        const metricsSnapshot = await db
            .collection('api_metrics')
            .where('timestamp', '>=', monthStart)
            .get();

        // Aggregate metrics
        const embeddingCalls = metricsSnapshot.docs.filter(m => m.data().type === 'embedding').length;
        const llmCalls = metricsSnapshot.docs.filter(m => m.data().type === 'llm').length;
        const totalCalls = embeddingCalls + llmCalls;

        // Calculate costs (from COST_CONFIG)
        // OpenAI embeddings: $0.02 per 1M tokens
        // LLM (gpt-4o-mini): $0.15 per 1M input tokens, assume 500 tokens per query
        const embeddingCost = (embeddingCalls / 1_000_000) * 0.02;
        const llmCost = (llmCalls * 500 / 1_000_000) * 0.15;
        const totalCost = embeddingCost + llmCost;

        // Estimate annual cost
        const daysInMonth = (monthStart.getMonth() === 11)
            ? (new Date(now.getFullYear() + 1, 0, 0).getDate())
            : (new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate());
        const daysPassed = now.getDate();
        const estimatedMonthCost = totalCost * (daysInMonth / Math.max(daysPassed, 1));
        const estimatedAnnualCost = estimatedMonthCost * 12;

        // Generate alerts
        const alerts = [];

        if (totalCalls === 0) {
            alerts.push({
                level: 'info',
                message: 'No API usage yet this month.',
            });
        }

        const llmRatio = totalCalls > 0 ? llmCalls / totalCalls : 0;
        if (llmRatio > 0.25) {
            alerts.push({
                level: 'warning',
                message: `LLM fallback ${(llmRatio * 100).toFixed(1)}% of queries — embedding quality may need retraining.`,
            });
        }

        const monthlyBudgetAlert = 50; // $50 budget alert threshold
        if (estimatedMonthCost > monthlyBudgetAlert) {
            alerts.push({
                level: 'alert',
                message: `Estimated monthly spend $${estimatedMonthCost.toFixed(2)} — exceeds $${monthlyBudgetAlert} alert threshold.`,
            });
        }

        // Calculate 7-day trend
        const trend = await calculateTrend(db);

        // Build response
        const response = {
            period: {
                start: monthStart.toISOString(),
                end: now.toISOString(),
            },
            calls: {
                embedding: embeddingCalls,
                llm: llmCalls,
                total: totalCalls,
                ratio: totalCalls > 0 ? embeddingCalls / totalCalls : 0,
            },
            costs: {
                embedding: embeddingCost.toFixed(2),
                llm: llmCost.toFixed(2),
                total: totalCost.toFixed(2),
                estimatedMonthly: estimatedMonthCost.toFixed(2),
                estimatedAnnual: estimatedAnnualCost.toFixed(2),
            },
            alerts: alerts,
            trend: trend,
        };

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });

    } catch (error) {
        console.error('[CostDashboard] Error:', error);
        return new Response(
            JSON.stringify({
                error: 'Cost dashboard request failed',
                details: error.message
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
