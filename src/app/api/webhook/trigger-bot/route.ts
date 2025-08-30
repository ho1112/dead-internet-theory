import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTableNames } from '@/lib/table-config';

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { post_id, url } = await request.json();

    if (!post_id || !url) {
      return NextResponse.json(
        { success: false, message: 'post_id와 url이 필요합니다.' },
        { status: 400 }
      );
    }

    const tableNames = getTableNames();

    // 1. 지연 시간 계산 (1분~3시간 랜덤)
    const delayMinutes = Math.floor(Math.random() * (180 - 1 + 1)) + 1; // 1~180분
    const delayMs = delayMinutes * 60 * 1000;
    
    // 2. 실행 시간 계산 (UTC 기준으로 현재 시간 + 지연 시간)
    const executionTime = new Date(Date.now() + delayMs);
    
    // 3. 지연 실행 정보를 데이터베이스에 저장
    const { data: scheduledJob, error: saveError } = await supabase
      .from(tableNames.scheduledJobs || 'scheduled_jobs')
      .insert({
        id: crypto.randomUUID(),
        post_id,
        url,
        execution_time: executionTime.toISOString(),
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`지연 실행 정보 저장 실패: ${saveError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: `봇 트리거가 예약되었습니다. ${delayMinutes}분 후 실행됩니다.`,
      data: {
        post_id,
        url,
        delay_minutes: delayMinutes,
        execution_time: executionTime.toISOString(),
        job_id: scheduledJob.id
      }
    });

  } catch (error) {
    console.error('웹훅 처리 오류:', error);
    return NextResponse.json(
      { success: false, message: `웹훅 처리 실패: ${error}` },
      { status: 500 }
    );
  }
}
