-- 댓글 테이블
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  author_name VARCHAR(100) NOT NULL,
  author_avatar TEXT NOT NULL,
  is_bot BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  post_id TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('approved', 'deleted')),
  
  -- 인덱스 생성
  CONSTRAINT valid_content_length CHECK (char_length(content) > 0)
);

-- 댓글 조회 성능 향상을 위한 인덱스
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_status ON comments(status);

-- AI 봇 페르소나 테이블
CREATE TABLE bot_personas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  avatar TEXT NOT NULL,
  personality TEXT NOT NULL,
  comment_style TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본 AI 봇 페르소나 데이터 삽입
INSERT INTO bot_personas (name, description, avatar, personality, comment_style) VALUES
(
  '긍정적인 신입',
  '항상 긍정적이고 격려하는 댓글을 작성하는 AI 봇',
  'https://api.dicebear.com/7.x/bottts/svg?seed=positive',
  '낙관적이고 격려적이며, 새로운 아이디어를 환영하는 성격',
  '이모티콘을 적극 활용하고, "와!", "정말 좋은 아이디어네요!" 같은 표현을 자주 사용'
),
(
  '전문가',
  '전문적이고 도움이 되는 조언을 제공하는 AI 봇',
  'https://api.dicebear.com/7.x/bottts/svg?seed=expert',
  '전문적이고 분석적이며, 구체적인 해결책을 제시하는 성격',
  '구체적인 예시와 단계별 설명을 제공하며, "~하는 것을 추천합니다" 같은 표현 사용'
),
(
  '친구',
  '편안하고 친근한 톤으로 대화하는 AI 봇',
  'https://api.dicebear.com/7.x/bottts/svg?seed=friend',
  '친근하고 편안하며, 공감과 이해를 바탕으로 소통하는 성격',
  '구어체를 사용하고, "나도 그런 경험이 있어", "정말 공감해" 같은 표현 사용'
);

-- 관리자 사용자 테이블 (간단한 인증용)
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 댓글 테이블 정책
CREATE POLICY "댓글은 누구나 읽을 수 있음" ON comments
  FOR SELECT USING (status = 'approved');

CREATE POLICY "댓글은 누구나 작성할 수 있음" ON comments
  FOR INSERT WITH CHECK (true);

-- 댓글 수정/삭제는 관리자만 가능
CREATE POLICY "댓글 수정/삭제는 관리자만 가능" ON comments
  FOR UPDATE USING (false); -- API를 통해서만 접근

CREATE POLICY "댓글 삭제는 관리자만 가능" ON comments
  FOR DELETE USING (false); -- API를 통해서만 접근

-- 봇 페르소나 테이블 정책
CREATE POLICY "봇 페르소나는 누구나 읽을 수 있음" ON bot_personas
  FOR SELECT USING (is_active = true);

-- 관리자 사용자 테이블 정책
CREATE POLICY "관리자만 접근 가능" ON admin_users
  FOR ALL USING (false); -- API를 통해서만 접근
