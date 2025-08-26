export interface Comment {
  id: string
  content: string
  author_name: string
  author_avatar: string
  is_bot: boolean
  parent_id: string | null
  created_at: string
  post_id: string
  status?: 'approved' | 'deleted'
}

export interface CreateCommentRequest {
  content: string
  author_name: string
  author_avatar: string
  is_bot: boolean
  parent_id?: string | null
  post_id: string
}

export interface CommentResponse {
  success: boolean
  data?: Comment | Comment[]
  error?: string
  code?: string
}

export interface BotPersona {
  id: string
  name: string
  description: string
  avatar: string
  personality: string
  comment_style: string
  is_active: boolean
  created_at: string
}

export interface AdminUser {
  id: string
  email: string
  password_hash: string
  created_at: string
}
