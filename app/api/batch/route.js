import { NextResponse } from 'next/server';
import { 
    getTeoClient, 
    getCommonClient, 
    ORIGIN_PULL_METRICS, 
    TOP_ANALYSIS_METRICS, 
    SECURITY_METRICS, 
    FUNCTION_METRICS 
} from '@/lib/teo-client';

function processTimeData(data, metric) {
    const dataList = data?.Data || data?.TimingDataRecords || [];
    if (dataList.length === 0) return { timeData: [], valueData: [], sum: 0, max: 0, avg: 0 };

    let typeValue;
    if (dataList[0]?.TypeValue) {
        typeValue = dataList[0].TypeValue.find(item => item.MetricName === metric || item.Metric === metric);
    } else if (dataList[0]?.Value) {
        typeValue = dataList[0].Value.find(item => item.MetricName === metric || item.Metric === metric);
    }

    if (!typeValue) {
        typeValue = dataList[0]?.TypeValue?.[0] || dataList[0]?.Value?.[0];
    }

    const details = typeValue?.Detail || [];
    return {
        timeData: details.map(d => d.Timestamp),
        valueData: details.map(d => d.Value),
        sum: typeValue?.Sum || 0,
        max: typeValue?.Max || 0,
        avg: typeValue?.Avg || 0
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

        const zoneIds = zoneId && zoneId !== '*' ? [zoneId] : [];

        const results = await Promise.all(requests.map(async (r) => {
            const { type, metric, startTime, endTime, interval } = r;
            const params = {
                StartTime: startTime,
                EndTime: endTime,
                MetricNames: [metric],
                Interval: interval && interval !== 'auto' ? interval : undefined
            };
            if (zoneIds.length > 0) {
                params.ZoneIds = zoneIds;
            }

            try {
                let data;
                if (type === 'Timing') {
                    if (ORIGIN_PULL_METRICS.includes(metric)) {
                        // Origin Pull API
                        data = await client.DescribeTimingL7OriginPullData(params);
                    } else if (FUNCTION_METRICS.includes(metric)) {
                        const commonClient = getCommonClient();
                        const { MetricNames, ...functionParams } = params;
                        data = await commonClient.request("DescribeTimingFunctionAnalysisData", {
                            ...functionParams,
                            MetricNames: [metric]
                        });
                    } else {
                        data = await client.DescribeTimingL7AnalysisData({
                            ...params,
                            Filters: []
                        });
                    }
                    return { metric, ...processTimeData(data, metric) };
                } else if (type === 'Top') {
                    const { MetricNames, ...topParams } = params;
                    data = await client.DescribeTopL7AnalysisData({
                        ...topParams,
                        MetricName: metric,
                        Limit: 10
                    });
                    return { metric, ...processTopData(data) };
                } else if (type === 'Security') {
                    const { MetricNames, ...securityParams } = params;
                    const requestParams = {
                        ...securityParams,
                        MetricNames: [metric],
                        Filters: []
                    };
                    
                    if (!requestParams.ZoneIds || requestParams.ZoneIds.length === 0) {
                        delete requestParams.ZoneIds;
                    }

                    try {
                        data = await client.DescribeTimingL7AnalysisData(requestParams);
                    } catch (apiErr) {
                        try {
                            // 尝试带上 Area
                            data = await client.DescribeTimingL7AnalysisData({ ...requestParams, Area: 'mainland' });
                        } catch (err2) {
                            console.error(`Security API Error for ${metric}:`, apiErr.message);
                            return { metric, data: [], sum: 0, max: 0, avg: 0 };
                        }
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
            const { metric, timeData, valueData, sum, max, avg, data } = res;

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
            } else if (data) {
                charts[`top_${metric}`] = { data };
            }
        });

        // Special KPI: Cache Hit Rate
        if (kpis.l7Flow_outFlux && kpis.l7Flow_inFlux_hy) {
            const edgeOut = kpis.l7Flow_outFlux.sum;
            const originIn = kpis.l7Flow_inFlux_hy.sum;
            kpis.cache_hit_rate = edgeOut > 0 ? ((1 - originIn / edgeOut) * 100).toFixed(2) : 0;
        }

        return NextResponse.json({ kpis, charts });
    } catch (err) {
        console.error("Batch API Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
