import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Target, Trophy, Clock, Zap } from "lucide-react";
import { format, parseISO, isBefore, isAfter, differenceInDays } from "date-fns";
import { dateFormatters } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { PersonalGoal, Skill, UserSkill, UserGamification, UserAchievement } from "@/types/database";

export const GoalsProgressCard = () => {
  const [goals, setGoals] = useState<PersonalGoal[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [gamification, setGamification] = useState<UserGamification | null>(null);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  
  // Form state
  const [selectedSkill, setSelectedSkill] = useState("");
  const [targetRating, setTargetRating] = useState<'high' | 'medium' | 'low'>('high');
  const [motivationNotes, setMotivationNotes] = useState("");
  
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.user_id) {
      fetchGoalsData();
    }
  }, [profile]);

  const fetchGoalsData = async () => {
    if (!profile?.user_id) return;
    
    try {
      setLoading(true);
      
      // Fetch user's approved skills for goal creation
      const { data: userSkillsData } = await supabase
        .from('user_skills')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('status', 'approved');
      
      // Fetch all available skills
      const { data: skillsData } = await supabase
        .from('skills')
        .select('*')
        .order('name');
      
      // Fetch personal goals
      const { data: goalsData } = await supabase
        .from('personal_goals')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false });
      
      // Fetch achievements
      const { data: achievementsData } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('earned_at', { ascending: false });
      
      // Fetch or create gamification data
      let { data: gamificationData } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', profile.user_id)
        .maybeSingle();
      
      if (!gamificationData) {
        const { data: newGamificationData } = await supabase
          .from('user_gamification')
          .insert({ user_id: profile.user_id })
          .select()
          .single();
        gamificationData = newGamificationData;
      }
      
      // Map user skills with skills data
      const userSkillsWithSkills = (userSkillsData || []).map(userSkill => {
        const skill = skillsData?.find(s => s.id === userSkill.skill_id);
        return {
          ...userSkill,
          rating: userSkill.rating as 'high' | 'medium' | 'low',
          status: userSkill.status as 'submitted' | 'approved' | 'rejected',
          skill: skill ? {
            id: skill.id,
            category_id: skill.category_id,
            name: skill.name,
            description: skill.description,
            created_at: skill.created_at
          } : undefined
        };
      });

      // Map goals with skills data
      const goalsWithSkills = (goalsData || []).map(goal => {
        const skill = skillsData?.find(s => s.id === goal.skill_id);
        return {
          ...goal,
          target_rating: goal.target_rating as 'high' | 'medium' | 'low',
          current_rating: goal.current_rating as 'high' | 'medium' | 'low',
          status: goal.status as 'active' | 'completed' | 'overdue' | 'cancelled',
          skill: skill ? {
            id: skill.id,
            category_id: skill.category_id,
            name: skill.name,
            description: skill.description,
            created_at: skill.created_at
          } : undefined
        };
      });
      
      setUserSkills(userSkillsWithSkills as UserSkill[]);
      setAvailableSkills(skillsData || []);
      setGoals(goalsWithSkills as PersonalGoal[]);
      setAchievements(achievementsData || []);
      setGamification(gamificationData);
      
    } catch (error) {
      console.error('Error fetching goals data:', error);
      toast({
        title: "Error",
        description: "Failed to load goals data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!profile?.user_id || !selectedSkill || !selectedDate) return;
    
    try {
      // Get current rating for the skill
      const userSkill = userSkills.find(us => us.skill_id === selectedSkill);
      const currentRating = userSkill?.rating || 'low';
      
      const { error } = await supabase
        .from('personal_goals')
        .insert({
          user_id: profile.user_id,
          skill_id: selectedSkill,
          target_rating: targetRating,
          current_rating: currentRating,
          target_date: format(selectedDate, 'yyyy-MM-dd'),
          motivation_notes: motivationNotes,
          progress_percentage: calculateInitialProgress(currentRating, targetRating)
        });
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Goal created successfully! +10 XP awarded",
      });
      
      setShowCreateGoal(false);
      setSelectedSkill("");
      setTargetRating('high');
      setMotivationNotes("");
      setSelectedDate(undefined);
      
      fetchGoalsData();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive",
      });
    }
  };

  const calculateInitialProgress = (current: string, target: string) => {
    const ratingValues = { low: 1, medium: 2, high: 3 };
    const currentValue = ratingValues[current as keyof typeof ratingValues] || 1;
    const targetValue = ratingValues[target as keyof typeof ratingValues] || 3;
    return Math.min(100, Math.round((currentValue / targetValue) * 100));
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'high': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-slate-600 bg-slate-50 border-slate-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusColor = (goal: PersonalGoal) => {
    const today = new Date();
    const targetDate = parseISO(goal.target_date);
    
    if (goal.status === 'completed') return 'text-emerald-600 bg-emerald-50';
    if (goal.status === 'overdue' || isBefore(targetDate, today)) return 'text-red-600 bg-red-50';
    if (differenceInDays(targetDate, today) <= 7) return 'text-amber-600 bg-amber-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getDaysRemaining = (targetDate: string) => {
    const days = differenceInDays(parseISO(targetDate), new Date());
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return 'Due today';
    return `${days} days left`;
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const overdueGoals = goals.filter(g => g.status === 'overdue' || 
    (g.status === 'active' && isBefore(parseISO(g.target_date), new Date())));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            My Goals & Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Loading goals...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* XP and Level Display */}
      {gamification && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-purple-900">Level {gamification.level}</p>
                  <p className="text-sm text-purple-700">{gamification.total_xp} XP</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-700">
                  🔥 {gamification.current_streak} streak
                </p>
                <p className="text-xs text-purple-600">
                  {gamification.goals_achieved_count}/{gamification.goals_set_count} goals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Goals Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                My Goals & Progress
              </CardTitle>
              <CardDescription>
                Track your personal skill development goals
              </CardDescription>
            </div>
            <Dialog open={showCreateGoal} onOpenChange={setShowCreateGoal}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[min(448px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Create Personal Goal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="skill">Skill</Label>
                    <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select skill to improve" />
                      </SelectTrigger>
                      <SelectContent>
                        {userSkills
                          .filter(userSkill => userSkill.skill_id && userSkill.skill_id.trim() !== '')
                          .map((userSkill) => (
                            <SelectItem key={userSkill.skill_id} value={userSkill.skill_id}>
                              {userSkill.skill?.name} (Current: {userSkill.rating})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="target">Target Rating</Label>
                    <Select value={targetRating} onValueChange={(value: 'high' | 'medium' | 'low') => setTargetRating(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Target Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? dateFormatters.formatDate(selectedDate) : "Pick target date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          disabled={(date) => isBefore(date, new Date())}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Motivation Notes</Label>
                    <Textarea
                      id="notes"
                      value={motivationNotes}
                      onChange={(e) => setMotivationNotes(e.target.value)}
                      placeholder="What motivates you to achieve this goal?"
                      rows={3}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleCreateGoal} 
                    className="w-full"
                    disabled={!selectedSkill || !selectedDate}
                  >
                    Create Goal (+10 XP)
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Active Goals ({activeGoals.length})
              </h3>
              <div className="space-y-3">
                {activeGoals.map((goal) => (
                  <div key={goal.id} className="p-4 border rounded-lg bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{goal.skill?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {goal.motivation_notes}
                        </p>
                      </div>
                      <Badge variant="outline" className={getStatusColor(goal)}>
                        {getDaysRemaining(goal.target_date)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-3">
                      <Badge variant="outline" className={getRatingColor(goal.current_rating)}>
                        Current: {goal.current_rating}
                      </Badge>
                      <span className="text-sm text-muted-foreground">→</span>
                      <Badge variant="outline" className={getRatingColor(goal.target_rating)}>
                        Target: {goal.target_rating}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{goal.progress_percentage}%</span>
                      </div>
                      <Progress value={goal.progress_percentage} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Overdue Goals */}
          {overdueGoals.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-red-600">
                <Clock className="h-4 w-4" />
                Overdue Goals ({overdueGoals.length})
              </h3>
              <div className="space-y-3">
                {overdueGoals.map((goal) => (
                  <div key={goal.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-red-900">{goal.skill?.name}</h4>
                        <p className="text-sm text-red-700">Don't give up! You can still achieve this!</p>
                      </div>
                      <Badge variant="outline" className="text-red-600 bg-red-100 border-red-300">
                        {getDaysRemaining(goal.target_date)}
                      </Badge>
                    </div>
                    <Progress value={goal.progress_percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Goals & Achievements */}
          {(completedGoals.length > 0 || achievements.length > 0) && (
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-emerald-600">
                <Trophy className="h-4 w-4" />
                Achievements ({completedGoals.length + achievements.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {completedGoals.map((goal) => (
                  <div key={goal.id} className="p-3 border border-emerald-200 rounded-lg bg-emerald-50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎯</span>
                      <div>
                        <p className="font-medium text-emerald-900">{goal.skill?.name}</p>
                        <p className="text-xs text-emerald-700">
                          Completed {dateFormatters.formatDate(goal.completed_at!)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {achievements.slice(0, 6).map((achievement) => (
                  <div key={achievement.id} className="p-3 border border-purple-200 rounded-lg bg-purple-50">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{achievement.badge_icon}</span>
                      <div>
                        <p className="font-medium text-purple-900">{achievement.achievement_name}</p>
                        <p className="text-xs text-purple-700">{achievement.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {goals.length === 0 && (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">No goals yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set your first skill improvement goal to start tracking progress
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};