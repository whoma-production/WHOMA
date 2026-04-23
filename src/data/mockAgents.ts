export interface MockAgentProfile {
  name: string;
  location: string;
  speciality: string;
  dealsVerified: number;
  yearsActive: number;
  avatar: string;
}

export const mockAgents: MockAgentProfile[] = [
  {
    name: "Marcus Okafor",
    location: "East London",
    speciality: "New build & off-plan",
    dealsVerified: 14,
    yearsActive: 8,
    avatar: "https://picsum.photos/seed/marcus-agent/200/200"
  },
  {
    name: "Priya Ranasinghe",
    location: "South Manchester",
    speciality: "First-time buyer specialist",
    dealsVerified: 9,
    yearsActive: 5,
    avatar: "https://picsum.photos/seed/priya-agent/200/200"
  },
  {
    name: "Tom Callister",
    location: "Bristol & Bath",
    speciality: "Period property & renovation",
    dealsVerified: 22,
    yearsActive: 12,
    avatar: "https://picsum.photos/seed/tom-agent/200/200"
  },
  {
    name: "Yemi Adeyemi",
    location: "Birmingham",
    speciality: "Investment & portfolio sales",
    dealsVerified: 17,
    yearsActive: 9,
    avatar: "https://picsum.photos/seed/yemi-agent/200/200"
  }
];
