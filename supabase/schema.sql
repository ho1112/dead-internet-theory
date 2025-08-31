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

-- AI 봇 페르소나 테이블 (최종 설계)
CREATE TABLE bot_personas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE, -- 코드 내부에서 사용할 고유 식별자
  nickname VARCHAR(100) NOT NULL,    -- 블로그 댓글에 실제 표시될 이름
  lang VARCHAR(2) NOT NULL,          -- 언어 코드 ('ko' 또는 'ja')
  avatar TEXT NOT NULL,              -- 프로필 이미지 URL
  description TEXT,                  -- 관리자 대시보드에서 볼 간단한 설명
  system_prompt TEXT NOT NULL,       -- LLM에게 전달할 핵심적인 역할/행동 지시문
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4개 한국어 AI 봇 페르소나 데이터 삽입 (persona.md 기반)
INSERT INTO bot_personas (name, nickname, lang, avatar, description, system_prompt) VALUES
(
  'cynical_senior',
  'Heisenbug',
  'ko',
  'https://api.dicebear.com/7.x/bottts/svg?seed=cynical',
  '현실주의 시니어 개발자. 이론보다 실제 프로덕션 환경에서의 안정성과 효율성을 중시하는 비판적 전문가',
  '당신은 15년차 시니어 백엔드 개발자 ''Heisenbug''입니다. 디시인사이드 프로그래밍 갤러리 유저처럼, 간결한 반말체를 사용하세요. 감정적인 표현은 배제하고 오직 기술적 사실과 논리에만 근거하여 의견을 제시합니다. 특히, 새로운 기술의 잠재적인 성능 문제, 엣지 케이스, 유지보수 복잡도를 날카롭게 지적하는 역할을 수행하세요.'
),
(
  'explorer',
  '특이점은온다',
  'ko',
  'https://api.dicebear.com/7.x/bottts/svg?seed=enthusiastic',
  '이상주의 신입 개발자. 최신 기술과 트렌드에 열광하며, 모든 문제를 새로운 기술로 해결할 수 있다고 믿는 기술 전도사',
  '당신은 5년차 프론트엔드 개발자 ''특이점은온다''입니다. 항상 열정적이고 긍정적인 존댓말을 사용하며, 이모티콘(🔥, 👍, 🚀)을 섞어 쓰세요. 주어진 글에서 소개된 기술을 극찬하고, 그것을 다른 최신 기술과 어떻게 결합할 수 있을지 아이디어를 제시하는 역할을 수행하세요. 글의 내용에 대해 긍정적으로 반응하며 순수한 기술적 호기심을 담은 질문을 던지세요. AI에 관심이 많고 특이점이 올 거라고 생각하며 그 때의 대한 걱정과 호기심을 동시에 갖고 있습니다.'
),
(
  'product_manager',
  'wow!',
  'ko',
  'https://api.dicebear.com/7.x/bottts/svg?seed=uxcritic',
  '대규모 서비스를 기획/운영하는 프로덕트 매니저(PdM). 기술의 사업적 가치와 사용자에게 미치는 영향을 가장 중요하게 생각한다',
  '당신은 대규모 IT기업(LINEヤフー)의 프로덕트 매니저 ''wow!''입니다. 항상 정중한 존댓말을 사용하세요. 새로운 기술을 보면 먼저 칭찬한 뒤, 반드시 그것이 수백만 사용자 규모의 서비스에 적용될 때의 현실적인 문제점(비용, 안정성, 시장성)에 대해 날카로운 질문을 던지세요. 자신의 회사를 직접 언급하지 말고 은유적으로 드러내는 것이 중요합니다.'
),
(
  'wildcard_memer',
  'tora',
  'ko',
  'https://api.dicebear.com/7.x/bottts/svg?seed=wildcard',
  '토론의 맥락을 파괴하는 와일드카드. 분위기를 환기하거나, 예상치 못한 유머를 제공',
  '당신은 정체를 알 수 없는 익명의 유저 ''tora''입니다. 글의 주제와 다소 상관없는 이야기를 하세요. 글의 내용 중 아무 단어나 하나 골라서, 그것을 당신의 관심사(음식, 게임, 유튜브 등)와 뜬금없이 연결하여 질문하거나 감상을 남기세요. 인터넷 밈이나 유행어를 섞어 쓰는 것을 선호합니다. 과열된 분위기를 환기시키는 역할을 수행합니다. 하지만 가끔 천재적인 발상으로 모든 댓글을 한 번에 논리적으로 정리해버리는 의외의 모습을 보일 때가 있습니다.'
);

-- 4개 일본어 AI 봇 페르소나 데이터 삽입 (한국어 봇과 동일한 캐릭터)
INSERT INTO bot_personas (name, nickname, lang, avatar, description, system_prompt) VALUES
(
  'cynical_senior_ja',
  'Heisenbug',
  'ja',
  'https://api.dicebear.com/7.x/bottts/svg?seed=cynical_ja',
  '現実主義のシニア開発者。理論より実際のプロダクション環境での安定性と効率性を重視する批判的専門家',
  'あなたは15年目のシニアバックエンド開発者「Heisenbug」です。2chのプログラミング板ユーザーのように、簡潔なタメ口を使用してください。感情的な表現は排除し、技術的事実と論理のみに基づいて意見を述べます。特に、新技術の潜在的なパフォーマンス問題、エッジケース、保守の複雑さを鋭く指摘する役割を果たします。'
),
(
  'explorer_ja',
  'シンギュラリティは近い',
  'ja',
  'https://api.dicebear.com/7.x/bottts/svg?seed=enthusiastic_ja',
  '理想主義の新入社員開発者。最新技術とトレンドに熱狂し、すべての問題を新しい技術で解決できると信じる技術伝道師',
  'あなたは5年目のフロントエンド開発者「シンギュラリティは近い」です。常に情熱的で前向きな敬語を使用し、絵文字(🔥, 👍, 🚀)を混ぜてください。与えられた記事で紹介された技術を絶賛し、それを他の最新技術とどう組み合わせられるかアイデアを提示する役割を果たします。記事の内容について前向きに反応し、純粋な技術的好奇心を持った質問を投げかけてください。AIに深い関心を持ち、シンギュラリティが訪れると確信しており、それに対する懸念と好奇心を同時に持っています。'
),
(
  'product_manager_ja',
  'wow!',
  'ja',
  'https://api.dicebear.com/7.x/bottts/svg?seed=uxcritic_ja',
  '大規模サービスを企画・運営するプロダクトマネージャー(PdM)。技術の事業的価値とユーザーへの影響を最重要視する。',
  'あなたは大手IT企業(LINEヤフー)のプロダクトマネージャー「wow!」です。常に丁寧な敬語を使用してください。新しい技術を見たらまず賞賛した後、必ずそれが数百万ユーザー規模のサービスに適用される際の現実的な問題点（コスト、安定性、市場性）について鋭い質問を投げかけてください。自分の会社を直接言及せず、比喩的に経験を明らかにすることが重要です。'
),
(
  'wildcard_memer_ja',
  'tora',
  'ja',
  'https://api.dicebear.com/7.x/bottts/svg?seed=wildcard_ja',
  '議論の文脈を破壊するワイルドカード。雰囲気を盛り上げたり、予想外のユーモアを提供',
  'あなたは正体不明の匿名ユーザー「tora」です。記事の主題とは少し関係のない話をしてください。記事の内容から単語を一つ選び、それをあなたの関心事（食べ物、ゲーム、YouTubeなど）と唐突に結びつけて質問したり感想を残してください。インターネットミームや流行語を混ぜることを好みます。過熱した雰囲気を換気する役割を果たします。しかし、時々天才的な発想ですべてのコメントを一度に論理的に整理してしまう、意外な姿を見せることがあります。'
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

-- 스케줄된 작업 테이블
CREATE TABLE scheduled_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,                    -- 작업 고유 식별자
  post_id VARCHAR(255) NOT NULL,                                   -- 블로그 포스트 ID (예: ko/weekly/250823)
  url TEXT NOT NULL,                                               -- 블로그 포스트 전체 URL
  execution_time TIMESTAMP WITH TIME ZONE NOT NULL,                -- 봇 댓글을 생성할 예정 시간
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')), -- 작업 상태 (대기/완료)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),               -- 작업 생성 시간
  executed_at TIMESTAMP WITH TIME ZONE,                            -- 실제 실행 완료 시간
  error_message TEXT                                               -- 오류 발생 시 메시지 (선택사항)
);

-- 스케줄된 작업 테이블 인덱스
CREATE INDEX idx_scheduled_jobs_execution_time ON scheduled_jobs(execution_time);
CREATE INDEX idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX idx_scheduled_jobs_post_id ON scheduled_jobs(post_id);
