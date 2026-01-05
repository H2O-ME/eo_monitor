'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { 
  Activity, 
  BarChart3, 
  Globe, 
  Zap, 
  PieChart, 
  Clock, 
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  Shield,
  Cpu,
  ArrowUpRight,
  ArrowDownLeft,
  MousePointer2,
  Server,
  Layers,
  Lock,
  Moon,
  Sun
} from 'lucide-react';

import KPICard from '../components/KPICard';
import ChartContainer from '../components/ChartContainer';
import { 
  provinceMap, 
  countryMap, 
  metricsConfig, 
  metricLabels, 
  metricColors,
  codeToMapName 
} from '../lib/constants';
import { 
  calculateTimeRange, 
  calculatePreviousRange, 
  formatBytes, 
  formatBps, 
  formatCount, 
  getBestUnit, 
  getBestCountUnit 
} from '../lib/utils';

// Edge Runtime for EdgeOne Pages
// export const runtime = 'edge';

export default function Dashboard() {
  // State for controls
  const [timeRange, setTimeRange] = useState('24h');
  const [interval, setInterval] = useState('auto');
  const [zoneId, setZoneId] = useState('*');
  const [zones, setZones] = useState([]);
  const [customParams, setCustomParams] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize dark mode from system preference or localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (savedTheme === 'dark' || (!savedTheme && systemDark)) {
        setIsDark(true);
        document.documentElement.classList.add('dark');
      }
    } catch (e) {
      console.error('Theme initialization failed:', e);
    }
    setMounted(true);
  }, []);

  const toggleDarkMode = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // State for data
  const [kpiData, setKpiData] = useState({});
  const [chartData, setChartData] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch zones on mount
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await fetch('/api/zones');
        const data = await res.json();
        if (data.Zones) {
          setZones(data.Zones);
        }
      } catch (err) {
        console.error('Failed to fetch zones:', err);
      }
    };
    fetchZones();
  }, []);

  // Fetch all data
  const fetchData = useCallback(async (force = false) => {
    const cacheKey = `eo_monitor_data_${zoneId}_${timeRange}_${interval}`;
    
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 2 minutes
        if (Date.now() - timestamp < 2 * 60 * 1000) {
          setKpiData(data.kpis);
          setChartData(data.charts);
          setLastUpdated(new Date(timestamp));
          return;
        }
      }
    }

    setLoading(true);
    const range = calculateTimeRange(timeRange, customParams);

    // Build batch requests
    const requests = [
      // Traffic
      { type: 'Timing', metric: 'l7Flow_flux', ...range, interval },
      { type: 'Timing', metric: 'l7Flow_inFlux', ...range, interval },
      { type: 'Timing', metric: 'l7Flow_outFlux', ...range, interval },
      { type: 'Timing', metric: 'l7Flow_request', ...range, interval },
      { type: 'Timing', metric: 'l7Flow_cacheHitRate', ...range, interval },
      // Bandwidth
      { type: 'Timing', metric: 'l7Flow_bandwidth', ...range, interval },
      { type: 'Timing', metric: 'l7Flow_inBandwidth', ...range, interval },
      { type: 'Timing', metric: 'l7Flow_outBandwidth', ...range, interval },
      // Performance
      { type: 'Timing', metric: 'l7Flow_avgResponseTime', ...range, interval },
      { type: 'Timing', metric: 'l7Flow_avgFirstByteResponseTime', ...range, interval },
      // Origin Pull
      { type: 'Timing', metric: 'l7Flow_outFlux_hy', ...range, interval },
      { type: 'Timing', metric: 'l7Flow_inFlux_hy', ...range, interval },
      { type: 'Timing', metric: 'l7Flow_outBandwidth_hy', ...range, interval },
      { type: 'Timing', metric: 'l7Flow_inBandwidth_hy', ...range, interval },
      { type: 'Timing', metric: 'l7Flow_request_hy', ...range, interval },
      // Security
      { type: 'Security', metric: 'ccAcl_interceptNum', ...range, interval },
      { type: 'Security', metric: 'ccManage_interceptNum', ...range, interval },
      { type: 'Security', metric: 'ccRate_interceptNum', ...range, interval },
      // Edge Functions
      { type: 'Timing', metric: 'function_requestCount', ...range, interval },
      { type: 'Timing', metric: 'function_cpuCostTime', ...range, interval },
      // Top Analysis
      { type: 'Top', metric: 'l7Flow_outFlux_domain', ...range, interval },
      { type: 'Top', metric: 'l7Flow_request_domain', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_province', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_country', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_statusCode', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_url', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_resourceType', ...range, interval },
    ];

    try {
      const batchRes = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests, zoneId: zoneId === '*' ? '' : zoneId })
      });

      const batchData = await batchRes.json();
      
      if (batchData.kpis && batchData.charts) {
        setKpiData(batchData.kpis);
        setChartData(batchData.charts);
        setLastUpdated(new Date());
        
        // Save to cache
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: batchData,
          timestamp: Date.now()
        }));
      }

    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange, interval, zoneId, customParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Chart option helpers
  const getTimeChartOption = (title, metrics, data, unitType = 'bytes') => {
    if (!data || !data.timeData) return {};

    const maxValue = Math.max(...metrics.flatMap(m => data[m]?.valueData || [0]));
    const { unit, divisor } = getBestUnit(maxValue, unitType);
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const splitLineColor = isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9';
    const tooltipBg = isDark ? '#1e293b' : 'rgba(255, 255, 255, 0.95)';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
    const tooltipText = isDark ? '#f1f5f9' : '#1e293b';

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        textStyle: { color: tooltipText, fontSize: 12 },
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 8px;',
        formatter: (params) => {
          let html = `<div style="font-weight: 700; margin-bottom: 8px; color: ${isDark ? '#64748b' : '#64748b'}; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">${params[0].name}</div>`;
          params.forEach(p => {
            const val = p.value;
            const formatted = unitType === 'bandwidth' ? formatBps(val) : 
                             unitType === 'count' ? formatCount(val) : 
                             unitType === 'ms' ? `${val.toFixed(2)} ms` : formatBytes(val);
            html += `<div style="display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 4px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${p.color}"></span>
                <span style="color: ${isDark ? '#94a3b8' : '#475569'};">${p.seriesName}</span>
              </div>
              <span style="font-weight: 600; color: ${tooltipText};">${formatted}</span>
            </div>`;
          });
          return html;
        }
      },
      legend: {
        show: true,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: textColor, fontSize: 12 },
        bottom: 0,
        left: 'center'
      },
      grid: { left: '2%', right: '2%', bottom: '12%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.timeData,
        axisLine: { lineStyle: { color: splitLineColor } },
        axisLabel: { color: textColor, fontSize: 11, margin: 12 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: splitLineColor, type: 'dashed' } },
        axisLabel: {
          color: textColor,
          fontSize: 11,
          formatter: (v) => `${(v / divisor).toFixed(1)} ${unit}`
        }
      },
      series: metrics.map(m => ({
        name: metricLabels[m] || m,
        type: 'line',
        smooth: 0.4,
        showSymbol: false,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${metricColors[m]}20` },
              { offset: 1, color: `${metricColors[m]}00` }
            ]
          }
        },
        lineStyle: { width: 3, color: metricColors[m] },
        itemStyle: { color: metricColors[m] },
        emphasis: {
          lineStyle: { width: 4, shadowBlur: 10, shadowColor: `${metricColors[m]}40` }
        },
        data: data[m]?.valueData || []
      }))
    };
  };

  const getBarChartOption = (title, data, metricName) => {
    if (!data || !data.data) return {};

    const items = data.data.slice(0, 10);
    const maxValue = Math.max(...items.map(i => i.Value));
    const isCount = metricName.includes('request');
    const { unit, divisor } = isCount ? getBestCountUnit(maxValue) : getBestUnit(maxValue, 'bytes');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const tooltipBg = isDark ? '#1e293b' : 'rgba(255, 255, 255, 0.95)';
    const tooltipBorder = isDark ? '#334155' : '#e2e8f0';
    const tooltipText = isDark ? '#f1f5f9' : '#1e293b';

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: [10, 14],
        extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border-radius: 8px;',
        formatter: (params) => {
          const p = params[0];
          const val = p.value;
          const formatted = isCount ? formatCount(val) : formatBytes(val);
          return `<div style="font-weight: 700; margin-bottom: 4px; color: ${tooltipText}">${p.name}</div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${p.color}"></span>
                    <span style="color: ${isDark ? '#94a3b8' : '#475569'}; font-weight: 600;">${formatted}</span>
                  </div>`;
        }
      },
      grid: { left: '2%', right: '8%', bottom: '2%', top: '2%', containLabel: true },
      xAxis: {
        type: 'value',
        splitLine: { show: false },
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'category',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: isDark ? '#cbd5e1' : '#475569', fontSize: 12, margin: 12 },
        data: items.map(i => {
          if (metricName.includes('province')) return provinceMap[i.Key] || i.Key;
          if (metricName.includes('country')) return countryMap[i.Key] || i.Key;
          return i.Key;
        }).reverse()
      },
      series: [{
        type: 'bar',
        barWidth: '40%',
        data: items.map(i => i.Value).reverse(),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: metricColors[metricName] || '#3b82f6' },
            { offset: 1, color: `${metricColors[metricName]}40` || '#3b82f640' }
          ]),
          borderRadius: [0, 20, 20, 0]
        },
        label: {
          show: true,
          position: 'right',
          color: textColor,
          fontSize: 11,
          fontWeight: 500,
          formatter: (p) => isCount ? formatCount(p.value) : formatBytes(p.value)
        }
      }]
    };
  };

  if (!mounted) return null;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950' : 'bg-[#f8fafc]'} pb-12 transition-colors duration-300`}>
      {/* Header - Removed sticky for better mobile/watch experience */}
      <header className="relative z-30 w-full border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <Activity size={18} className="sm:hidden" />
              <Activity size={22} className="hidden sm:block" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white leading-tight truncate">EdgeOne Monitor</h1>
              <div className="flex items-center gap-1.5">
                <span className="flex h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[8px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">系统运行正常</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
              aria-label="切换深色模式"
            >
              {isDark ? <Sun size={16} className="sm:hidden" /> : <Moon size={16} className="sm:hidden" />}
              {isDark ? <Sun size={18} className="hidden sm:block" /> : <Moon size={18} className="hidden sm:block" />}
            </button>

            {/* Zone Selector - Hidden on very small screens, shown as icon on mobile */}
            <div className="hidden sm:flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <Globe size={14} className="text-slate-500 dark:text-slate-400" />
              <select 
                className="bg-transparent border-none text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-0 p-0 pr-4 sm:pr-6 cursor-pointer"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
              >
                <option value="*">所有站点</option>
                {zones.map(z => (
                  <option key={z.ZoneId} value={z.ZoneId}>{z.ZoneName}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => fetchData(true)}
              disabled={loading}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`${loading ? 'animate-spin' : ''}`} size={16} className="sm:hidden" />
              <RefreshCw className={`${loading ? 'animate-spin' : ''}`} size={18} className="hidden sm:block" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex-1 flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-100 dark:border-slate-700">
              <Clock size={14} className="text-slate-400 dark:text-slate-500" />
              <select 
                className="bg-transparent border-none text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-0 p-0 pr-6 sm:pr-8 cursor-pointer w-full"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="30min">最近 30 分钟</option>
                <option value="1h">最近 1 小时</option>
                <option value="6h">最近 6 小时</option>
                <option value="24h">最近 24 小时</option>
                <option value="today">今天</option>
                <option value="yesterday">昨天</option>
                <option value="3d">最近 3 天</option>
                <option value="7d">最近 7 天</option>
                <option value="14d">最近 14 天</option>
                <option value="31d">最近 31 天</option>
              </select>
            </div>

            <div className="flex-1 flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-100 dark:border-slate-700">
              <Filter size={14} className="text-slate-400 dark:text-slate-500" />
              <select 
                className="bg-transparent border-none text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-0 p-0 pr-6 sm:pr-8 cursor-pointer w-full"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              >
                <option value="auto">自动频率</option>
                <option value="min">1 分钟</option>
                <option value="5min">5 分钟</option>
                <option value="hour">1 小时</option>
                <option value="day">1 天</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-around sm:justify-end gap-3 sm:gap-6 px-3 sm:px-4 py-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg sm:rounded-xl border border-blue-100/50 dark:border-blue-800/50">
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-[8px] sm:text-[10px] font-bold text-blue-400 dark:text-blue-500 uppercase tracking-wider">缓存命中率</span>
              <span className="text-xs sm:text-sm font-black text-blue-700 dark:text-blue-400">{kpiData.l7Flow_cacheHitRate?.avg ?? 0}%</span>
            </div>
            <div className="h-6 sm:h-8 w-px bg-blue-200/50 dark:bg-blue-800/50"></div>
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-[8px] sm:text-[10px] font-bold text-blue-400 dark:text-blue-500 uppercase tracking-wider">总请求数</span>
              <span className="text-xs sm:text-sm font-black text-blue-700 dark:text-blue-400">{formatCount(kpiData.l7Flow_request?.sum)}</span>
            </div>
            {lastUpdated && (
              <>
                <div className="hidden xs:block h-6 sm:h-8 w-px bg-blue-200/50 dark:bg-blue-800/50"></div>
                <div className="hidden xs:flex flex-col items-center sm:items-start">
                  <span className="text-[8px] sm:text-[10px] font-bold text-blue-400 dark:text-blue-500 uppercase tracking-wider">更新于</span>
                  <span className="text-xs sm:text-sm font-black text-blue-700 dark:text-blue-400">{lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Traffic Section */}
        <section className="space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 sm:gap-3">
              <span className="h-6 sm:h-8 w-1 sm:w-1.5 rounded-full bg-blue-500"></span>
              流量分析
            </h2>
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard 
              title="总流量" 
              value={formatBytes(kpiData.l7Flow_flux?.sum)} 
              description="统计周期内累计流量" 
              loading={loading}
              icon={Layers}
              color="blue"
            />
            <KPICard 
              title="上行流量" 
              value={formatBytes(kpiData.l7Flow_inFlux?.sum)} 
              description="客户端至边缘节点" 
              loading={loading}
              icon={ArrowDownLeft}
              color="amber"
            />
            <KPICard 
              title="下行流量" 
              value={formatBytes(kpiData.l7Flow_outFlux?.sum)} 
              description="边缘节点至客户端" 
              loading={loading}
              icon={ArrowUpRight}
              color="emerald"
            />
            <KPICard 
              title="峰值带宽" 
              value={formatBps(kpiData.l7Flow_bandwidth?.max)} 
              description="统计周期内最高带宽" 
              loading={loading}
              icon={Zap}
              color="purple"
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <ChartContainer title="流量趋势" loading={loading} icon={Activity} subtitle="随时间变化的流量分布" height="300px">
              <ReactECharts 
                option={getTimeChartOption('流量趋势', metricsConfig.traffic, chartData.traffic, 'bytes')} 
                style={{ height: '100%' }}
              />
            </ChartContainer>
            <ChartContainer title="请求趋势" loading={loading} icon={MousePointer2} subtitle="随时间变化的请求量分布" height="300px">
              <ReactECharts 
                option={getTimeChartOption('请求趋势', metricsConfig.requests, chartData.requests, 'count')} 
                style={{ height: '100%' }}
              />
            </ChartContainer>
          </div>
        </section>

        {/* Origin & Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <section className="lg:col-span-2 space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 sm:gap-3">
              <span className="h-6 sm:h-8 w-1 sm:w-1.5 rounded-full bg-indigo-500"></span>
              回源分析
            </h2>
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
              <KPICard 
                title="回源流量" 
                value={formatBytes(kpiData.l7Flow_inFlux_hy?.sum)} 
                description="从源站拉取的流量" 
                loading={loading}
                icon={Server}
                color="indigo"
              />
              <KPICard 
                title="回源峰值" 
                value={formatBps(kpiData.l7Flow_inBandwidth_hy?.max)} 
                description="回源最高带宽" 
                loading={loading}
                icon={Zap}
                color="rose"
              />
              <KPICard 
                title="回源请求" 
                value={formatCount(kpiData.l7Flow_request_hy?.sum)} 
                description="回源请求总数" 
                loading={loading}
                icon={RefreshCw}
                color="orange"
              />
            </div>
            <ChartContainer title="回源趋势" loading={loading} icon={RefreshCw} height="280px">
              <ReactECharts 
                option={getTimeChartOption('回源趋势', metricsConfig.originPull, chartData.originPull, 'bytes')} 
                style={{ height: '100%' }}
              />
            </ChartContainer>
          </section>

          <section className="space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 sm:gap-3">
              <span className="h-6 sm:h-8 w-1 sm:w-1.5 rounded-full bg-cyan-500"></span>
              性能分析
            </h2>
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
              <KPICard 
                title="平均响应时间" 
                value={`${(kpiData.l7Flow_avgResponseTime?.avg ?? 0).toFixed(2)} ms`} 
                description="全链路平均延迟" 
                loading={loading}
                icon={Clock}
                color="cyan"
              />
              <KPICard 
                title="首字节时间" 
                value={`${(kpiData.l7Flow_avgFirstByteResponseTime?.avg ?? 0).toFixed(2)} ms`} 
                description="平均首字节响应时间" 
                loading={loading}
                icon={Zap}
                color="orange"
              />
            </div>
            <ChartContainer title="延迟趋势" loading={loading} icon={Activity} height="220px">
              <ReactECharts 
                option={getTimeChartOption('延迟趋势', metricsConfig.performance, chartData.performance, 'ms')} 
                style={{ height: '100%' }}
              />
            </ChartContainer>
          </section>
        </div>

        {/* Security & Functions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <section className="space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 sm:gap-3">
              <span className="h-6 sm:h-8 w-1 sm:w-1.5 rounded-full bg-rose-500"></span>
              安全事件
            </h2>
            <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
              <KPICard title="精确防护" value={formatCount(kpiData.ccAcl_interceptNum?.sum)} description="ACL 拦截数" loading={loading} icon={Shield} color="rose" />
              <KPICard title="托管规则" value={formatCount(kpiData.ccManage_interceptNum?.sum)} description="WAF 拦截数" loading={loading} icon={Lock} color="amber" />
              <KPICard title="速率限制" value={formatCount(kpiData.ccRate_interceptNum?.sum)} description="速率限制拦截" loading={loading} icon={Activity} color="blue" />
            </div>
            <ChartContainer title="安全趋势" loading={loading} icon={Shield} height="280px">
              <ReactECharts 
                option={getTimeChartOption('安全趋势', metricsConfig.security, chartData.security, 'count')} 
                style={{ height: '100%' }}
              />
            </ChartContainer>
          </section>

          <section className="space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 sm:gap-3">
              <span className="h-6 sm:h-8 w-1 sm:w-1.5 rounded-full bg-orange-500"></span>
              边缘函数
            </h2>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
              <KPICard title="执行次数" value={formatCount(kpiData.function_requestCount?.sum)} description="函数执行总次数" loading={loading} icon={Cpu} color="orange" />
              <KPICard title="CPU 时间" value={`${(kpiData.function_cpuCostTime?.sum ?? 0).toFixed(2)} ms`} description="函数消耗的 CPU 总时间" loading={loading} icon={Zap} color="purple" />
            </div>
            <ChartContainer title="函数趋势" loading={loading} icon={Cpu} height="280px">
              <ReactECharts 
                option={getTimeChartOption('函数趋势', metricsConfig.edgeFunctions, chartData.edgeFunctions, 'count')} 
                style={{ height: '100%' }}
              />
            </ChartContainer>
          </section>
        </div>

        {/* Top Analysis */}
        <section className="space-y-4 sm:space-y-6">
          <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 sm:gap-3">
            <span className="h-6 sm:h-8 w-1 sm:w-1.5 rounded-full bg-purple-500"></span>
            排行榜
          </h2>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <ChartContainer title="热门域名" loading={loading} icon={Globe} height="320px">
              <ReactECharts option={getBarChartOption('热门域名', chartData.top_l7Flow_outFlux_domain, 'l7Flow_outFlux_domain')} style={{ height: '100%' }} />
            </ChartContainer>
            <ChartContainer title="热门国家/地区" loading={loading} icon={Globe} height="320px">
              <ReactECharts option={getBarChartOption('热门国家/地区', chartData.top_l7Flow_outFlux_country, 'l7Flow_outFlux_country')} style={{ height: '100%' }} />
            </ChartContainer>
            <ChartContainer title="状态码分布" loading={loading} icon={Activity} height="320px">
              <ReactECharts option={getBarChartOption('状态码分布', chartData.top_l7Flow_outFlux_statusCode, 'l7Flow_outFlux_statusCode')} style={{ height: '100%' }} />
            </ChartContainer>
            <ChartContainer title="热门 URL" loading={loading} icon={MousePointer2} height="320px">
              <ReactECharts option={getBarChartOption('热门 URL', chartData.top_l7Flow_outFlux_url, 'l7Flow_outFlux_url')} style={{ height: '100%' }} />
            </ChartContainer>
            <ChartContainer title="资源类型分布" loading={loading} icon={Layers} height="320px">
              <ReactECharts option={getBarChartOption('资源类型分布', chartData.top_l7Flow_outFlux_resourceType, 'l7Flow_outFlux_resourceType')} style={{ height: '100%' }} />
            </ChartContainer>
            <ChartContainer title="国内省份分布" loading={loading} icon={Globe} height="320px">
              <ReactECharts option={getBarChartOption('国内省份分布', chartData.top_l7Flow_outFlux_province, 'l7Flow_outFlux_province')} style={{ height: '100%' }} />
            </ChartContainer>
          </div>
        </section>
      </main>
    </div>
  );
}
