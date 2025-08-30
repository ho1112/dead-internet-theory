import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTableNames } from '@/lib/table-config';

// Supabase 클라이언트 생성
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Vercel Cron Job에서 호출
    const tableNames = getTableNames();
    
    // 1. 실행 시간이 된 작업들 조회
    const { data: pendingJobs, error: fetchError } = await supabase
      .from(tableNames.scheduledJobs || 'scheduled_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('execution_time', new Date().toISOString())
      .order('execution_time', { ascending: true });

    if (fetchError) {
      throw new Error(`작업 조회 실패: ${fetchError.message}`);
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: '실행할 작업이 없습니다.',
        processed_count: 0
      });
    }

    let processedCount = 0;
    const results = [];

    // 2. 각 작업 처리
    for (const job of pendingJobs) {
      try {
        // 상태를 'executing'으로 변경 (실제로는 필요 없지만 로그용)
        console.log(`작업 실행 시작: ${job.id}`);

        // AI 봇 디렉터 호출
        const aiResponse = await fetch(`${request.nextUrl.origin}/api/bot/director`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ post_id: job.post_id })
        });

        if (aiResponse.ok) {
          // 성공: 상태를 'completed'로 변경
          await supabase
            .from(tableNames.scheduledJobs || 'scheduled_jobs')
            .update({ 
              status: 'completed',
              executed_at: new Date().toISOString()
            })
            .eq('id', job.id);

          results.push({ job_id: job.id, status: 'success' });
          processedCount++;
        } else {
          // 실패: 그냥 pending 상태로 두고 다음에 다시 시도
          const errorData = await aiResponse.json();
          console.error(`작업 실패: ${job.id}`, errorData.message);
          results.push({ job_id: job.id, status: 'failed', error: errorData.message });
        }

      } catch (error) {
        // 오류 발생: 그냥 pending 상태로 두고 다음에 다시 시도
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`작업 오류: ${job.id}`, errorMessage);
        results.push({ job_id: job.id, status: 'failed', error: errorMessage });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${processedCount}개 작업이 처리되었습니다.`,
      processed_count: processedCount,
      results
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Cron Job 처리 오류:', errorMessage);
    return NextResponse.json(
      { success: false, message: `Cron Job 처리 실패: ${errorMessage}` },
      { status: 500 }
    );
  }
}
