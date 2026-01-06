import { NextResponse } from 'next/server';
import { 
    getTeoClient, 
    getCommonClient, 
    ORIGIN_PULL_METRICS, 
    TOP_ANALYSIS_METRICS, 
    SECURITY_METRICS, 
    FUNCTION_METRICS,
    PAGES_METRICS
} from '@/lib/teo-client';

function processTimeData(data, metric) {
    // Some APIs return the data wrapped in a Response object
    const actualData = data?.Response || data;
    
    // Support multiple possible data paths
    const dataList = actualData?.Data || actualData?.TimingDataRecords || actualData?.Records || [];
    if (dataList.length === 0) {
        // Try top-level Value/TypeValue if Data/Records missing
        const topLevelValue = actualData?.TypeValue || actualData?.Value;
        if (!topLevelValue) return { timeData: [], valueData: [], sum: 0, max: 0, avg: 0 };
        return extractFromTypeValue(topLevelValue, metric);
    }

    let typeValue;
    // Iterate through dataList to find the matching metric
    for (const item of dataList) {
        const values = item.TypeValue || item.Value || [];
        typeValue = values.find(v => v.MetricName === metric || v.Metric === metric);
        if (typeValue) break;
    }

    // Fallback if not found by name
    if (!typeValue && dataList[0]) {
        typeValue = dataList[0].TypeValue?.[0] || dataList[0].Value?.[0];
    }

    return extractFromTypeValue(typeValue, metric);
}

function extractFromTypeValue(typeValue, metric) {
    if (!typeValue) return { timeData: [], valueData: [], sum: 0, max: 0, avg: 0 };
    
    const details = typeValue.Detail || typeValue.Details || [];
    return {
        timeData: details.map(d => d.Timestamp || d.Time),
        valueData: details.map(d => d.Value),
        sum: typeValue.Sum ?? 0,
        max: typeValue.Max ?? 0,
        avg: typeValue.Avg ?? 0
    };
}

function processTopData(data) {
    return {
        data: data?.Data?.[0]?.DetailData || []
    };
}

export async function POST(request) {
    try {
        const { requests, zoneId } = await request.json();
        const client = getTeoClient();
        if (!client) return NextResponse.json({ error: "Missing credentials" }, { status: 500 });

        let effectiveZoneIds = [];
        if (zoneId && zoneId !== '*') {
            effectiveZoneIds = [zoneId];
        } else {
            try {
                const zonesData = await client.DescribeZones({});
                const zonesList = zonesData?.Response?.Zones || zonesData?.Zones || [];
                effectiveZoneIds = zonesList.map(z => z.ZoneId);
            } catch (err) {
                console.error("Failed to fetch zones for batch request:", err);
            }
        }

        const results = await Promise.all(requests.map(async (r) => {
            const { type, metric, startTime, endTime, interval, ...extraParams } = r;
            const params = {
                StartTime: startTime,
                EndTime: endTime,
                MetricNames: [metric],
                Interval: interval && interval !== 'auto' ? interval : undefined,
                ...extraParams
            };
            
            // Add ZoneIds for all APIs that support/require it
            if (effectiveZoneIds.length > 0) {
                params.ZoneIds = effectiveZoneIds;
            }

            try {
                let data;
                if (type === 'Timing') {
                    if (ORIGIN_PULL_METRICS.includes(metric)) {
                        // DescribeTimingL7OriginPullData requires Area typically
                        try {
                            data = await client.DescribeTimingL7OriginPullData(params);
                        } catch (e) {
                            data = await client.DescribeTimingL7OriginPullData({ ...params, Area: 'mainland' });
                        }
                    } else if (FUNCTION_METRICS.includes(metric)) {
                        const commonClient = getCommonClient();
                        const { MetricNames, ...functionParams } = params;
                        data = await commonClient.request("DescribeTimingFunctionAnalysisData", {
                            ...functionParams,
                            MetricNames: [metric]
                        });
                    } else if (PAGES_METRICS.includes(metric)) {
                        const { MetricNames, ...pagesParams } = params;
                        let command = "";
                        if (metric === 'pages_build_count') command = "getBuildingCounts";
                        else if (metric === 'pages_cloud_function_requests') command = "getFunctionRequests";
                        else if (metric === 'pages_cloud_function_monthly_stats') command = "getMonthlyStats";

                        // Pages APIs usually need exactly one ZoneId or specific params
                        // For summary dashboard, we use the first selected zone or the first in list
                        data = await client.DescribePagesResources({
                            ZoneId: effectiveZoneIds[0] || "",
                            Command: command
                        });
                        
                        const actualData = data?.Response || data;
                        if (actualData?.Result) {
                            try {
                                const parsed = JSON.parse(actualData.Result);
                                return { metric, type: 'Pages', ...parsed };
                            } catch (e) {
                                return { metric, type: 'Pages', rawResult: actualData.Result };
                            }
                        }
                        return { metric, ...actualData };
                    } else {
                        data = await client.DescribeTimingL7AnalysisData({
                            Filters: [],
                            ...params
                        });
                    }
                    return { metric, ...processTimeData(data, metric) };
                } else if (type === 'Top') {
                    const { MetricNames, ...topParams } = params;
                    data = await client.DescribeTopL7AnalysisData({
                        Limit: 10,
                        ...topParams,
                        MetricName: metric,
                    });
                    return { metric, ...processTopData(data) };
                } else if (type === 'Security') {
                    const { MetricNames, ...securityParams } = params;
                    const requestParams = {
                        MetricNames: [metric],
                        ...securityParams,
                        ZoneIds: effectiveZoneIds
                    };
                    
                    // For security, limit interval and add Filters if needed
                    if (requestParams.Interval === 'day') {
                        requestParams.Interval = 'hour';
                    }
                    if (!requestParams.Interval || requestParams.Interval === 'auto') {
                        requestParams.Interval = 'min';
                    }

                    const tryModes = [
                        () => client.DescribeTimingL7AnalysisData({ ...requestParams }), // Try without Filters
                        () => client.DescribeTimingL7AnalysisData({ ...requestParams, Filters: [] }), // Try with empty Filters
                        () => client.DescribeTimingL7AnalysisData({ ...requestParams, Area: 'mainland' }),
                        () => client.DescribeTimingL7AnalysisData({ ...requestParams, Area: 'overseas' })
                    ];

                    data = null;
                    let lastErr = null;
                    for (const tryFn of tryModes) {
                        try {
                            data = await tryFn();
                            if (data) break;
                        } catch (err) {
                            lastErr = err;
                        }
                    }

                    if (!data) {
                        console.error(`Security API Error for ${metric}: ${lastErr?.message || 'Unknown error'}`);
                        return { metric, data: [], sum: 0, max: 0, avg: 0 };
                    }
                    return { metric, ...processTimeData(data, metric) };
                }
            } catch (err) {
                    console.error(`Error fetching ${metric}:`, err);
                    if (err.code === 'InvalidParameter') {
                        console.error(`Full error for ${metric}:`, JSON.stringify(err, null, 2));
                    }
                    return { metric, error: err.message };
                }
        }));

        // Organize results for easier consumption
        const kpis = {};
        const charts = {
            traffic: { timeData: [] },
            bandwidth: { timeData: [] },
            originPull: { timeData: [] },
            security: { timeData: [] },
            performance: { timeData: [] },
            requests: { timeData: [] },
            edgeFunctions: { timeData: [] }
        };

        results.forEach(res => {
            if (!res || res.error) return;
            const { metric, timeData, valueData, sum, max, avg, data: topData, type: resType, ...parsed } = res;

            // Handle Pages Stats
            if (resType === 'Pages') {
                kpis[metric] = parsed;
                
                // If it contains time-series data (for Pages Cloud Functions)
                if (parsed.Timestamps && parsed.Values) {
                    charts[`top_${metric}`] = { 
                        timeData: parsed.Timestamps,
                        valueData: parsed.Values
                    };
                }
                return;
            }

            // Store KPI
            kpis[metric] = { sum, max, avg };

            // Store Chart Data
            if (timeData && valueData) {
                if (['l7Flow_flux', 'l7Flow_inFlux', 'l7Flow_outFlux'].includes(metric)) {
                    charts.traffic.timeData = timeData;
                    charts.traffic[metric] = { valueData };
                } else if (['l7Flow_bandwidth', 'l7Flow_inBandwidth', 'l7Flow_outBandwidth'].includes(metric)) {
                    charts.bandwidth.timeData = timeData;
                    charts.bandwidth[metric] = { valueData };
                } else if (ORIGIN_PULL_METRICS.includes(metric)) {
                    charts.originPull.timeData = timeData;
                    charts.originPull[metric] = { valueData };
                } else if (SECURITY_METRICS.includes(metric)) {
                    charts.security.timeData = timeData;
                    charts.security[metric] = { valueData };
                } else if (FUNCTION_METRICS.includes(metric)) {
                    charts.edgeFunctions.timeData = timeData;
                    charts.edgeFunctions[metric] = { valueData };
                } else if (['l7Flow_request'].includes(metric)) {
                    charts.requests.timeData = timeData;
                    charts.requests[metric] = { valueData };
                } else if (['l7Flow_avgResponseTime', 'l7Flow_avgFirstByteResponseTime'].includes(metric)) {
                    charts.performance.timeData = timeData;
                    charts.performance[metric] = { valueData };
                }
            } else if (topData) {
                charts[`top_${metric}`] = { data: topData };
            }
        });

        // Special KPI: Cache Hit Rate
        if (kpis.l7Flow_outFlux && kpis.l7Flow_inFlux_hy) {
            const edgeOut = kpis.l7Flow_outFlux.sum;
            const originIn = kpis.l7Flow_inFlux_hy.sum;
            kpis.cache_hit_rate = edgeOut > 0 ? ((1 - originIn / edgeOut) * 100).toFixed(2) : 0;
        } else {
            kpis.cache_hit_rate = 0;
        }

        return NextResponse.json({ kpis, charts });
    } catch (err) {
        console.error("Batch API Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
