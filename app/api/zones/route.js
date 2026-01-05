import { NextResponse } from 'next/server';
import { getTeoClient } from '@/lib/teo-client';

export async function GET() {
    try {
        const client = getTeoClient();
        if (!client) {
            return NextResponse.json({ error: "Missing credentials" }, { status: 500 });
        }

        const data = await client.DescribeZones({});
        return NextResponse.json(data);
    } catch (err) {
        console.error("Error calling DescribeZones:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
