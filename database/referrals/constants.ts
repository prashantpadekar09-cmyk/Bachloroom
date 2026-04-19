export type ReferralRewardType = "unlock_owner_contact" | "owner_listed_room";

export const REFERRAL_REWARD_USER_UNLOCK_RUPEES = 10;
export const REFERRAL_REWARD_OWNER_LIST_RUPEES = 15;

export type AwardResult =
  | { awarded: true; amount: number; referrerId: string }
  | { awarded: false; reason: "no-referrer" | "already-awarded" | "invalid-referrer" };
