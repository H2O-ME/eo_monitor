import { teo } from "tencentcloud-sdk-nodejs-teo";
import { CommonClient } from "tencentcloud-sdk-nodejs-common";
import fs from 'fs';
import path from 'path';

export function getKeys() {
    let secretId = process.env.SECRET_ID;
    let secretKey = process.env.SECRET_KEY;

    if (secretId && secretKey) {
        return { secretId, secretKey };
    }

    try {
        const keyPath = path.resolve(process.cwd(), 'key.txt');
        if (fs.existsSync(keyPath)) {
            const content = fs.readFileSync(keyPath, 'utf-8');
            const lines = content.split('\n');
            lines.forEach(line => {
                if (line.includes('SecretId') && !secretId) {
                    secretId = line.split('：')[1]?.trim();
                }
                if (line.includes('SecretKey') && !secretKey) {
                    secretKey = line.split('：')[1]?.trim();
                }
            });
        }
    } catch (err) {
        console.error("Error reading key.txt:", err);
    }

    return { secretId, secretKey };
}

export function getTeoClient(region = "ap-shanghai") {
    const { secretId, secretKey } = getKeys();
    if (!secretId || !secretKey) return null;

    const clientConfig = {
        credential: { secretId, secretKey },
        region,
        profile: { httpProfile: { endpoint: "teo.tencentcloudapi.com" } },
    };
    return new teo.v20220901.Client(clientConfig);
}

export function getCommonClient(region = "ap-singapore") {
    const { secretId, secretKey } = getKeys();
    if (!secretId || !secretKey) return null;

    const clientConfig = {
        credential: { secretId, secretKey },
        profile: { httpProfile: { endpoint: "teo.tencentcloudapi.com" } },
    };
    if (region) {
        clientConfig.region = region;
    } else {
        clientConfig.region = "ap-singapore";
    }
    return new CommonClient("teo.tencentcloudapi.com", "2022-09-01", clientConfig);
}

export const ORIGIN_PULL_METRICS = [
    'l7Flow_outFlux_hy',
    'l7Flow_outBandwidth_hy',
    'l7Flow_request_hy',
    'l7Flow_inFlux_hy',
    'l7Flow_inBandwidth_hy'
];

export const TOP_ANALYSIS_METRICS = [
    'l7Flow_outFlux_country',
    'l7Flow_outFlux_province',
    'l7Flow_outFlux_statusCode',
    'l7Flow_outFlux_domain',
    'l7Flow_outFlux_url',
    'l7Flow_outFlux_resourceType',
    'l7Flow_outFlux_sip',
    'l7Flow_outFlux_referers',
    'l7Flow_outFlux_ua_device',
    'l7Flow_outFlux_ua_browser',
    'l7Flow_outFlux_ua_os',
    'l7Flow_outFlux_ua',
    'l7Flow_request_country',
    'l7Flow_request_province',
    'l7Flow_request_statusCode',
    'l7Flow_request_domain',
    'l7Flow_request_url',
    'l7Flow_request_resourceType',
    'l7Flow_request_sip',
    'l7Flow_request_referers',
    'l7Flow_request_ua_device',
    'l7Flow_request_ua_browser',
    'l7Flow_request_ua_os',
    'l7Flow_request_ua'
];

export const SECURITY_METRICS = [
    'ccAcl_interceptNum',
    'ccManage_interceptNum',
    'ccRate_interceptNum'
];

export const FUNCTION_METRICS = [
    'function_requestCount',
    'function_cpuCostTime'
];
