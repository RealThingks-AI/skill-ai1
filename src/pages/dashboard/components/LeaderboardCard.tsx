import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Crown, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  total_xp: number;
  level: number;
  goals_achieved_count: number;
  current_streak: number;
  rank: number;
}

interface RankMovement {
  change: number; // positive = up, negative = down, 0 = no change
  isNew: boolean;
}

interface LeaderboardEntryWithMovement extends LeaderboardEntry {
  rankMovement?: RankMovement;
}

export const LeaderboardCard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntryWithMovement[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntryWithMovement | null>(null);
  const [showFull, setShowFull] = useState(false);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    fetchLeaderboard();
  }, [profile]);

  const fetchLeaderboard = async () => {
    if (!profile?.user_id) return;
    
    try {
      setLoading(true);
      
      // Fetch current leaderboard data
      const { data: leaderboardData } = await supabase
        .from('user_gamification')
        .select(`
          user_id,
          total_xp,
          level,
          goals_achieved_count,
          current_streak,
          profiles (
            full_name
          )
        `)
        .order('total_xp', { ascending: false })
        .limit(showFull ? 50 : 8);

      // Fetch last week's rankings for comparison
      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      lastWeekStart.setHours(0, 0, 0, 0);
      const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];

      const { data: lastWeekData } = await supabase
        .from('leaderboard_history')
        .select('user_id, rank_position')
        .eq('week_start_date', lastWeekStartStr);

      // Create a map for quick lookup of last week's ranks
      const lastWeekRanks = new Map(
        (lastWeekData || []).map(item => [item.user_id, item.rank_position])
      );

      // Add ranks and format data with movement
      const formattedData: LeaderboardEntryWithMovement[] = (leaderboardData || []).map((entry, index) => {
        const currentRank = index + 1;
        const lastWeekRank = lastWeekRanks.get(entry.user_id);
        
        let rankMovement: RankMovement | undefined;
        if (lastWeekRank !== undefined) {
          const change = lastWeekRank - currentRank; // positive = moved up, negative = moved down
          rankMovement = { change, isNew: false };
        } else {
          rankMovement = { change: 0, isNew: true };
        }

        return {
          user_id: entry.user_id,
          full_name: (entry.profiles as any)?.full_name || 'Anonymous',
          total_xp: entry.total_xp || 0,
          level: entry.level || 1,
          goals_achieved_count: entry.goals_achieved_count || 0,
          current_streak: entry.current_streak || 0,
          rank: currentRank,
          rankMovement
        };
      });

      setLeaderboard(formattedData);

      // Find current user's rank
      const currentUserRank = formattedData.find(entry => entry.user_id === profile.user_id);
      if (currentUserRank) {
        setUserRank(currentUserRank);
      } else {
        // If user not in top results, fetch their specific rank
        const { data: allUsers } = await supabase
          .from('user_gamification')
          .select('user_id, total_xp')
          .order('total_xp', { ascending: false });
        
        const userPosition = (allUsers || []).findIndex(u => u.user_id === profile.user_id);
        if (userPosition >= 0) {
          const { data: userData } = await supabase
            .from('user_gamification')
            .select(`
              user_id,
              total_xp,
              level,
              goals_achieved_count,
              current_streak,
              profiles (
                full_name
              )
            `)
            .eq('user_id', profile.user_id)
            .single();
          
          if (userData) {
            const userCurrentRank = userPosition + 1;
            const userLastWeekRank = lastWeekRanks.get(profile.user_id);
            
            let userRankMovement: RankMovement | undefined;
            if (userLastWeekRank !== undefined) {
              const change = userLastWeekRank - userCurrentRank;
              userRankMovement = { change, isNew: false };
            } else {
              userRankMovement = { change: 0, isNew: true };
            }

            setUserRank({
              user_id: userData.user_id,
              full_name: (userData.profiles as any)?.full_name || 'You',
              total_xp: userData.total_xp || 0,
              level: userData.level || 1,
              goals_achieved_count: userData.goals_achieved_count || 0,
              current_streak: userData.current_streak || 0,
              rank: userCurrentRank,
              rankMovement: userRankMovement
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-50 via-yellow-100 to-amber-100 border-yellow-300 shadow-md shadow-yellow-200/50';
      case 2: return 'bg-gradient-to-r from-gray-50 via-gray-100 to-slate-100 border-gray-300 shadow-md shadow-gray-200/50';
      case 3: return 'bg-gradient-to-r from-amber-50 via-orange-100 to-red-100 border-amber-300 shadow-md shadow-orange-200/50';
      default: 
        if (rank <= 10) return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm';
        return 'bg-card border-border hover:bg-gradient-to-r hover:from-gray-50 hover:to-slate-50';
    }
  };

  const getRankMovementIcon = (movement?: RankMovement) => {
    if (!movement || movement.isNew) return null;
    
    if (movement.change > 0) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <TrendingUp className="h-3 w-3" />
          <span className="text-xs font-medium">+{movement.change}</span>
        </div>
      );
    } else if (movement.change < 0) {
      return (
        <div className="flex items-center gap-1 text-red-500">
          <TrendingDown className="h-3 w-3" />
          <span className="text-xs font-medium">{movement.change}</span>
        </div>
      );
    }
    return <div className="text-xs text-muted-foreground">—</div>;
  };

  const topUsers = showFull ? leaderboard : leaderboard.slice(0, 6); // Reduced for better fit

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Leaderboard
        </CardTitle>
        <CardDescription>
          Top performers by XP points
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 space-y-3">
        {/* User's Current Rank - Compact */}
        {userRank && userRank.rank > 6 && !showFull && (
          <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-primary">#{userRank.rank}</span>
                  {getRankMovementIcon(userRank.rankMovement)}
                </div>
                <div>
                  <p className="font-medium text-primary text-xs">You</p>
                  <p className="text-xs text-primary/70">{userRank.total_xp} XP</p>
                </div>
              </div>
              <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                L{userRank.level}
              </Badge>
            </div>
          </div>
        )}

        {/* Top Rankings - Scrollable - Compact */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
          {topUsers.map((entry) => (
            <div 
              key={entry.user_id} 
              className={`p-2 rounded border ${getRankColor(entry.rank)} ${
                entry.user_id === profile?.user_id ? 'ring-1 ring-primary/20' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1 min-w-[24px]">
                    <div className="flex items-center gap-1">
                      {getRankIcon(entry.rank)}
                    </div>
                    {getRankMovementIcon(entry.rankMovement)}
                  </div>
                  <Avatar className={`h-6 w-6 ${entry.rank <= 3 ? 'ring-1 ring-offset-1' : ''} ${
                    entry.rank === 1 ? 'ring-yellow-400' : 
                    entry.rank === 2 ? 'ring-gray-400' : 
                    entry.rank === 3 ? 'ring-amber-500' : ''
                  }`}>
                    <AvatarFallback className={`text-xs font-semibold ${
                      entry.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                      entry.rank === 2 ? 'bg-gray-100 text-gray-800' :
                      entry.rank === 3 ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {entry.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-xs truncate ${
                        entry.user_id === profile?.user_id ? 'text-primary font-bold' : ''
                      }`}>
                        {entry.user_id === profile?.user_id ? 'You' : entry.full_name}
                      </p>
                      {entry.rankMovement?.isNew && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">
                          NEW
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Zap className="h-2 w-2" />
                        {entry.total_xp.toLocaleString()}
                      </span>
                      {entry.current_streak > 0 && (
                        <span className="text-orange-600">🔥 {entry.current_streak}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <Badge variant="outline" className={`text-xs mb-1 ${
                    entry.rank <= 3 ? 'font-semibold' : ''
                  }`}>
                    L{entry.level}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {entry.goals_achieved_count} goals
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Toggle Button */}
        <div className="flex-shrink-0">
          {leaderboard.length > 6 && !showFull && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => {
                setShowFull(true);
                fetchLeaderboard();
              }}
            >
              View Full Leaderboard
            </Button>
          )}

          {showFull && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setShowFull(false)}
            >
              Show Top 6
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};