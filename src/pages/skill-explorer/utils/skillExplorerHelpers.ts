export const getRatingColor = (rating: string) => {
  switch (rating) {
    case "high":
      return "bg-[hsl(var(--success))]";
    case "medium":
      return "bg-[hsl(var(--info))]";
    case "low":
      return "bg-[hsl(var(--warning))]";
    default:
      return "bg-muted";
  }
};

export const formatRole = (role: string) => {
  const roleMap: Record<string, string> = {
    tech_lead: "Tech Lead",
    management: "Management",
    admin: "Admin",
    employee: "Employee",
  };
  return roleMap[role] || role;
};

export const meetsRatingCriteria = (userRating: string, selectedRating: string) => {
  const ratingValues = {
    low: 1,
    medium: 2,
    high: 3,
  };
  const userValue = ratingValues[userRating as keyof typeof ratingValues];
  const selectedValue = ratingValues[selectedRating as keyof typeof ratingValues];
  if (selectedRating === "high") {
    return userValue === 3; // Only high
  } else if (selectedRating === "medium") {
    return userValue >= 2; // Medium or high
  } else {
    return true; // Low includes all
  }
};

export const getRatingValueForSubskill = (user: any, subskillName: string): number => {
  const skill = user.approved_skills.find((s: any) => s.subskill === subskillName);
  if (!skill) return 0;
  const ratingMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
  return ratingMap[skill.rating] || 0;
};

export const getHighestRatingValue = (user: any): number => {
  if (!user.approved_skills || user.approved_skills.length === 0) return 0;
  const ratingMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
  return Math.max(...user.approved_skills.map((s: any) => ratingMap[s.rating] || 0));
};
