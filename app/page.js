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
  Sun,
  FileText,
  Layout,
  Cloud
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
      // Top Analysis
      { type: 'Top', metric: 'l7Flow_outFlux_domain', ...range, interval },
      { type: 'Top', metric: 'l7Flow_request_domain', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_province', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_country', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_statusCode', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_url', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_resourceType', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_sip', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_referers', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_ua_browser', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_ua_os', ...range, interval },
      { type: 'Top', metric: 'l7Flow_outFlux_ua_device', ...range, interval },
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
    const splitLineColor = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';

    return {
      backgroundColor: 'transparent',
      animationDuration: 1200,
      animationEasing: 'cubicOut',
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.85)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        borderWidth: 1,
        textStyle: { color: isDark ? '#e2e8f0' : '#334155', fontSize: 12, fontFamily: 'Inter, sans-serif' },
        padding: [12, 16],
        borderRadius: 12,
        extraCssText: 'box-shadow: 0 8px 20px -4px rgb(0 0 0 / 0.15); backdrop-filter: blur(12px);',
        formatter: (params) => {
          let html = `<div style="font-weight: 600; font-size: 12px; margin-bottom: 10px; color: ${isDark ? '#94a3b8' : '#64748b'}; letter-spacing: 0.02em;">${params[0].name}</div>`;
          params.forEach(p => {
            const val = p.value;
            const formatted = unitType === 'bw' || unitType === 'bps' || unitType === 'bandwidth' ? formatBps(val) : 
                             unitType === 'count' ? formatCount(val) : 
                             unitType === 'ms' ? `${val.toFixed(2)} ms` : formatBytes(val);
            html += `<div style="display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 8px; height: 8px; border-radius: 2px; background-color: ${p.color}; box-shadow: 0 0 6px ${p.color}60;"></span>
                <span style="color: ${isDark ? '#cbd5e1' : '#475569'}; font-size: 12px; font-weight: 500;">${p.seriesName}</span>
              </div>
              <span style="font-family: inherit; font-weight: 700; font-feature-settings: 'tnum'; color: ${tooltipText}; font-size: 13px;">${formatted}</span>
            </div>`;
          });
          return html;
        }
      },
      legend: {
        show: true,
        icon: 'rect',
        itemWidth: 10,
        itemHeight: 3,
        itemGap: 16,
        textStyle: { color: textColor, fontSize: 11, fontWeight: 500 },
        bottom: 0,
        left: 'center',
        padding: [16, 0, 0, 0]
      },
      grid: { left: '4px', right: '16px', bottom: '14%', top: '6%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.timeData,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { 
            color: textColor, 
            fontSize: 10, 
            margin: 16,
            fontWeight: 500,
            interval: 'auto',
            showMaxLabel: true,
            showMinLabel: true 
        }
      },
      yAxis: {
        type: 'value',
        splitLine: { 
            show: true, 
            lineStyle: { color: splitLineColor, type: 'dashed', width: 1 } 
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: textColor,
          fontSize: 10,
          fontWeight: 500,
          margin: 12,
          formatter: (v) => {
            if (v === 0) return '0';
            const { unit, divisor } = getBestUnit(v, unitType === 'ms' ? 'bytes' : unitType); 
            // Reuse getBestUnit logic but adjust for count
            if (unitType === 'count') {
                if (v >= 1000000) return (v/1000000).toFixed(1) + 'M';
                if (v >= 1000) return (v/1000).toFixed(1) + 'K';
                return v;
            }
            return (v / divisor).toFixed(0) + unit;
          }
        }
      },
      series: metrics.map(m => {
        const baseColor = metricColors[m] || '#3b82f6';
        return {
          name: metricLabels[m] || m,
          type: 'line',
          smooth: 0.4,
          showSymbol: false,
          symbol: 'circle',
          symbolSize: 8,
          itemStyle: { color: baseColor, borderColor: isDark ? '#0f172a' : '#ffffff', borderWidth: 2 },
          lineStyle: { width: 2, color: baseColor, shadowBlur: 4, shadowColor: `${baseColor}40`, shadowOffsetY: 2 },
          areaStyle: {
            opacity: 0.15,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: baseColor },
              { offset: 1, color: 'transparent' }
            ])
          },
          emphasis: {
            scale: true,
            lineStyle: { width: 3 },
            itemStyle: { borderWidth: 2, shadowBlur: 10, shadowColor: baseColor }
          },
          data: data[m]?.valueData || []
        };
      })
    };
  };

  const getBarChartOption = (title, data, metricName) => {
    if (!data || !data.data) return {};

    const items = data.data.slice(0, 10);
    const maxValue = Math.max(...items.map(i => i.Value));
    const isCount = metricName.includes('request');
    const { unit, divisor } = isCount ? getBestCountUnit(maxValue) : getBestUnit(maxValue, 'bytes');
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const tooltipText = isDark ? '#f8fafc' : '#0f172a';
    const axisLineColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

    return {
      backgroundColor: 'transparent',
      animationDuration: 1000,
      animationEasing: 'cubicOut',
      grid: { left: '2%', right: '8%', bottom: '2%', top: '2%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)' } },
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.85)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        borderWidth: 1,
        textStyle: { color: isDark ? '#e2e8f0' : '#334155', fontSize: 12, fontFamily: 'Inter, sans-serif' },
        padding: [12, 16],
        borderRadius: 12,
        extraCssText: 'box-shadow: 0 8px 20px -4px rgb(0 0 0 / 0.15); backdrop-filter: blur(12px);',
        formatter: (params) => {
          const p = params[0];
          const val = p.value;
          const formatted = isCount ? formatCount(val) : formatBytes(val);
          // Show full name tooltips for truncated labels
          return `<div style="font-weight: 600; font-size: 13px; margin-bottom: 6px; color: ${tooltipText}; max-width: 240px; word-wrap: break-word;">${p.name}</div>
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="width: 6px; height: 6px; border-radius: 2px; background-color: ${p.color?.colorStops ? p.color.colorStops[0].color : p.color}"></span>
                        <span style="font-size: 12px; color: ${isDark ? '#cbd5e1' : '#475569'}">数值</span>
                    </div>
                    <span style="font-family: inherit; font-weight: 700; font-feature-settings: 'tnum'; color: ${p.color?.colorStops ? p.color.colorStops[0].color : p.color};">${formatted}</span>
                  </div>`;
        }
      },
      xAxis: {
        type: 'value',
        splitLine: { show: true, lineStyle: { color: axisLineColor, type: 'dashed' } },
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'category',
        inverse: true, // Show top item at top
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { 
          color: textColor, 
          fontSize: 12, 
          fontWeight: 500,
          margin: 16,
          width: 140, // More space for labels
          overflow: 'truncate',
          ellipsis: '...'
        },
        data: items.map(i => {
          if (metricName.includes('province')) return provinceMap[i.Key] || i.Key;
          if (metricName.includes('country')) return countryMap[i.Key] || i.Key;
          return i.Key;
        })
      },
      series: [{
        type: 'bar',
        barWidth: 16, // Fixed cleaner width
        showBackground: true,
        backgroundStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
          borderRadius: 4
        },
        data: items.map(i => i.Value),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
            { offset: 0, color: metricColors[metricName] || '#3b82f6' },
            { offset: 1, color: `${metricColors[metricName]}80` || '#3b82f680' }
          ]),
          borderRadius: [0, 4, 4, 0]
        },
        label: {
          show: true,
          position: 'right',
          color: textColor,
          fontSize: 11,
          fontFamily: 'monospace',
          fontWeight: 500,
          formatter: (p) => isCount ? formatCount(p.value) : formatBytes(p.value),
          valueAnimation: true
        }
      }]
    };
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0f18]' : 'bg-[#f8fafc]'} transition-colors duration-500 selection:bg-blue-500/30`}>
      {/* Refactored Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 ring-1 ring-white/20">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50 leading-none">
                EdgeOne <span className="text-blue-600 dark:text-blue-400">Monitor</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Live Monitoring</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Zone Selector */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg border border-slate-200/30 dark:border-slate-700/30 focus-within:ring-2 focus-within:ring-blue-500/50 transition-all">
              <Globe size={14} className="text-slate-400" />
              <select 
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-0 p-0 pr-6 cursor-pointer"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
              >
                <option value="*">所有站点资源</option>
                {zones.map(z => (
                  <option key={z.ZoneId} value={z.ZoneId}>{z.ZoneName}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 p-1 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/30 dark:border-slate-700/30">
              <button 
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm transition-all duration-200"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              
              <div className="w-px h-4 bg-slate-300/30 dark:bg-slate-600/30"></div>

              <button 
                onClick={() => fetchData(true)}
                disabled={loading}
                className={`p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 ${loading ? 'animate-spin' : ''}`}
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Optimized Filter Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-4 flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <Clock size={16} className="text-blue-500" />
              <select 
                className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 p-0 pr-8 cursor-pointer w-full"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="30min">最近 30 分钟</option>
                <option value="1h">最近 1 小时</option>
                <option value="6h">最近 6 小时</option>
                <option value="24h">最近 24 小时</option>
                <option value="today">今日数据</option>
                <option value="yesterday">昨日回顾</option>
                <option value="3d">最近 3 天</option>
                <option value="7d">最近 7 天</option>
              </select>
            </div>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <Filter size={16} className="text-indigo-500" />
              <select 
                className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 p-0 pr-8 cursor-pointer w-full"
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

          <div className="lg:col-span-8 flex items-center gap-4 px-6 py-3 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 dark:from-blue-600/10 dark:to-indigo-600/10 rounded-2xl border border-blue-200/20 dark:border-blue-500/10 shadow-inner overflow-x-auto">
            <div className="flex items-center gap-3 min-w-max">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-blue-500/70 uppercase tracking-widest">命中率</span>
                <span className="text-lg font-black text-slate-800 dark:text-blue-400 leading-none">{kpiData.cache_hit_rate ?? 0}%</span>
              </div>
              <div className="h-8 w-px bg-slate-300/30 dark:bg-slate-600/30"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-indigo-500/70 uppercase tracking-widest">总请求</span>
                <span className="text-lg font-black text-slate-800 dark:text-indigo-400 leading-none">{formatCount(kpiData.l7Flow_request?.sum)}</span>
              </div>
              <div className="h-8 w-px bg-slate-300/30 dark:bg-slate-600/30"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-500/70 uppercase tracking-widest">更新于</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-200 leading-none">{lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
              </div>
            </div>
            
            <div className="ml-auto hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              实时同步中
            </div>
          </div>
        </div>

        {/* Traffic Section */}
        <section className="space-y-4 sm:space-y-6 animate-fade-in-up">
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
              icon={ArrowUpRight}
              color="amber"
            />
            <KPICard 
              title="下行流量" 
              value={formatBytes(kpiData.l7Flow_outFlux?.sum)} 
              description="边缘节点至客户端" 
              loading={loading}
              icon={ArrowDownLeft}
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 animate-fade-in-up [animation-delay:150ms]">
          <section className="lg:col-span-2 space-y-4 sm:space-y-6">
            <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 sm:gap-3">
              <span className="h-6 sm:h-8 w-1 sm:w-1.5 rounded-full bg-indigo-500"></span>
              回源分析
            </h2>
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
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
            <div className="space-y-4">
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
            </div>
          </section>
        </div>

        {/* Top Analysis */}
        <section className="space-y-6 animate-fade-in-up [animation-delay:300ms]">
          <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 sm:gap-3">
            <span className="h-6 sm:h-8 w-1 sm:w-1.5 rounded-full bg-purple-500"></span>
            多维分析
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Resources Group */}
            <div className="space-y-6">
               <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">资源分布</h3>
               <ChartContainer title="热门域名" loading={loading} icon={Globe} height="360px">
                  <ReactECharts option={getBarChartOption('热门域名', chartData.top_l7Flow_outFlux_domain, 'l7Flow_outFlux_domain')} style={{ height: '100%' }} />
               </ChartContainer>
               <ChartContainer title="资源类型" loading={loading} icon={Layers} height="360px">
                  <ReactECharts option={getBarChartOption('资源类型', chartData.top_l7Flow_outFlux_resourceType, 'l7Flow_outFlux_resourceType')} style={{ height: '100%' }} />
               </ChartContainer>
               <ChartContainer title="状态码" loading={loading} icon={Activity} height="360px">
                  <ReactECharts option={getBarChartOption('状态码', chartData.top_l7Flow_outFlux_statusCode, 'l7Flow_outFlux_statusCode')} style={{ height: '100%' }} />
               </ChartContainer>
               <ChartContainer title="热门 URL" loading={loading} icon={MousePointer2} height="360px">
                  <ReactECharts option={getBarChartOption('热门 URL', chartData.top_l7Flow_outFlux_url, 'l7Flow_outFlux_url')} style={{ height: '100%' }} />
               </ChartContainer>
            </div>

            {/* Geography Group */}
            <div className="space-y-6">
               <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">地域分布</h3>
               <ChartContainer title="国家/地区" loading={loading} icon={Globe} height="400px">
                  <ReactECharts option={getBarChartOption('国家/地区', chartData.top_l7Flow_outFlux_country, 'l7Flow_outFlux_country')} style={{ height: '100%' }} />
               </ChartContainer>
               <ChartContainer title="国内省份" loading={loading} icon={Globe} height="400px">
                  <ReactECharts option={getBarChartOption('国内省份', chartData.top_l7Flow_outFlux_province, 'l7Flow_outFlux_province')} style={{ height: '100%' }} />
               </ChartContainer>
               <ChartContainer title="客户端 IP" loading={loading} icon={Shield} height="400px">
                  <ReactECharts option={getBarChartOption('客户端 IP', chartData.top_l7Flow_outFlux_sip, 'l7Flow_outFlux_sip')} style={{ height: '100%' }} />
               </ChartContainer>
            </div>

            {/* Client Group */}
            <div className="space-y-6">
               <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pl-1">客户端环境</h3>
               <ChartContainer title="浏览器" loading={loading} icon={Globe} height="360px">
                  <ReactECharts option={getBarChartOption('浏览器', chartData.top_l7Flow_outFlux_ua_browser, 'l7Flow_outFlux_ua_browser')} style={{ height: '100%' }} />
               </ChartContainer>
               <ChartContainer title="操作系统" loading={loading} icon={Cpu} height="360px">
                  <ReactECharts option={getBarChartOption('操作系统', chartData.top_l7Flow_outFlux_ua_os, 'l7Flow_outFlux_ua_os')} style={{ height: '100%' }} />
               </ChartContainer>
               <ChartContainer title="设备类型" loading={loading} icon={Layers} height="360px">
                  <ReactECharts option={getBarChartOption('设备类型', chartData.top_l7Flow_outFlux_ua_device, 'l7Flow_outFlux_ua_device')} style={{ height: '100%' }} />
               </ChartContainer>
               <ChartContainer title="Referer 来源" loading={loading} icon={MousePointer2} height="360px">
                  <ReactECharts option={getBarChartOption('Referer 来源', chartData.top_l7Flow_outFlux_referers, 'l7Flow_outFlux_referers')} style={{ height: '100%' }} />
               </ChartContainer>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
