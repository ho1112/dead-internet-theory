# Dead Internet Theory - AI Bot Comment System

AI 봇이 자동으로 블로그 댓글을 생성하는 시스템입니다.

## 🚀 주요 기능

- **AI 봇 페르소나**: 4개 AI 봇이 각각의 성격으로 댓글 생성
- **자동화된 봇 댓글**: 새 포스트 감지 시 자동으로 봇 댓글 예약
- **자연스러운 타이밍**: 1분~3시간 랜덤 지연으로 봇 활동 숨김
- **GitHub Actions Cron**: 5분마다 자동으로 예약된 작업 처리

## ⚙️ 설정

### GitHub Actions Cron Job 설정

1. **GitHub 저장소에서 Secrets 설정**:
   - `VERCEL_URL`: Vercel 배포된 도메인 (예: `https://your-app.vercel.app`)

2. **워크플로우 자동 실행**:
   - `.github/workflows/bot-cron.yml` 파일이 자동으로 5분마다 실행됨
   - GitHub 서버에서 24시간 365일 계속 동작

3. **수동 실행**:
   - GitHub Actions 탭에서 "Bot Comment Cron Job" 워크플로우 선택
   - "Run workflow" 버튼으로 수동 실행 가능

## 🔧 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
```

## 📊 시스템 구조

```
새 포스트 생성 → GitHub Actions 웹훅 → 작업 예약 (1분~3시간 지연)
    ↓
GitHub Actions Cron (5분마다) → 실행 시간 확인 → AI 봇 디렉터 호출
    ↓
봇 선택 및 댓글 생성 → Supabase 저장 → 상태 업데이트
```

## 🧪 테스트

### 로컬 테스트
```bash
# 웹훅 API 테스트
curl -X POST http://localhost:3001/api/webhook/trigger-bot \
  -H "Content-Type: application/json" \
  -d '{"post_id": "test/post", "url": "http://localhost:3000/test/post"}'

# Cron Job API 수동 테스트
curl -X GET http://localhost:3001/api/cron/process-scheduled-jobs
```

### GitHub Actions 테스트
- GitHub Actions 탭에서 워크플로우 실행 로그 확인
- 5분마다 자동 실행되는지 모니터링

## 🎯 배포

1. **Vercel에 배포**
2. **GitHub Secrets에 VERCEL_URL 설정**
3. **GitHub Actions 자동 실행 시작**

## 📝 라이선스

MIT License
