export interface DetectionCandidate {
  index: number;
  label: string;
  confidence: number;
}

export interface DetectionResult {
  health_status: string;
  fish_species: string;
  disease: string;
  confidence_score: number;
  treatment_recommendations: string;
  domain: string;
  image_sha256?: string | null;
  before_image_b64?: string | null;
  after_image_b64?: string | null;
  is_low_confidence?: boolean;
  analysis_note?: string | null;
  top_predictions?: DetectionCandidate[];
}

export interface ScanHistory {
  id: string;
  health_status: string;
  fish_species: string;
  disease: string;
  confidence_score: number;
  treatment_recommendations: string;
  domain: string;
  created_at: string;
  before_image_b64?: string | null;
}

export interface DashboardStats {
  total_scans: number;
  healthy_ratio: number;
  top_disease: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_b64?: string | null;
  created_at: string;
}

export interface UserProfilePost {
  id: string;
  created_at: string;
  post_text: string;
  ai_fish_species: string;
  ai_health_status: string;
  ai_confidence_score: number;
  image_b64?: string | null;
  likes_count: number;
  comments_count: number;
}

export interface UserProfileDetail {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_b64?: string | null;
  created_at: string;
  posts_count: number;
  posts: UserProfilePost[];
}

export interface CommunityComment {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  body: string;
  parent_comment_id?: string | null;
  created_at: string;
  is_owner: boolean;
  is_expert: boolean;
  likes_count: number;
  liked_by_current_user: boolean;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  user_name: string;
  fish_species: string;
  disease: string;
  health_status: string;
  entry_kind: "scan" | "community" | string;
  created_at: string;
  image_b64?: string | null;
  post_text: string;
  ai_fish_species: string;
  ai_health_status: string;
  ai_treatment_recommendation: string;
  ai_confidence_score: number;
  likes_count: number;
  comments_count: number;
  liked_by_current_user: boolean;
  title?: string | null;
}

export interface CommunityPostDetail extends CommunityPost {
  comments: CommunityComment[];
}

export interface CommunityFeedPage {
  items: CommunityPost[];
  next_offset: number | null;
}

export interface CommunityPostSuggestion {
  normalized_problem: string;
  predicted_fish_species: string;
  predicted_health_status: string;
  treatment_recommendation: string;
  confidence_score: number;
  is_fish: boolean;
}

export interface AppNotification {
  id: string;
  kind: string;
  message: string;
  is_read: boolean;
  created_at: string;
  actor_user_name?: string | null;
  post_id?: string | null;
  comment_id?: string | null;
}

export type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "friend";

export interface SocialUser {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_b64?: string | null;
  friendship_status: FriendshipStatus;
  pending_request_id?: string | null;
}

export interface FriendRequest {
  id: string;
  status: string;
  created_at: string;
  sender: SocialUser;
  receiver: SocialUser;
}

export interface FriendConnection {
  user: SocialUser;
  friends_since: string;
  unread_messages_count: number;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  is_own: boolean;
  is_read: boolean;
  created_at: string;
}

export interface SocialOverview {
  discoverable_users: SocialUser[];
  received_requests: FriendRequest[];
  sent_requests: FriendRequest[];
  friends: FriendConnection[];
}

export interface ConversationData {
  friend: SocialUser;
  messages: DirectMessage[];
}

export type UserRole = "farmer" | "expert" | "admin" | "developer";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserRoleUpdatePayload {
  role: UserRole;
}

export interface RoleCodeUpdatePayload {
  code: string;
  role: UserRole;
}
