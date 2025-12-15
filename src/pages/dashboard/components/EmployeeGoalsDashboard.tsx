import { useState } from "react";
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
import { CalendarIcon, Plus, Target, Trophy, Clock, Zap, Star, AlertTriangle, TrendingUp } from "lucide-react";
import { format, parseISO, isBefore, differenceInDays } from "date-fns";
import { dateFormatters } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { useGoalsProgress } from "@/hooks/useGoalsProgress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export const EmployeeGoalsDashboard = () => {
  const { goals, gamification, loading, refreshGoals } = useGoalsProgress();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSkill, setSelectedSkill] = useState("");
  const [targetRating, setTargetRating] = useState<'high' | 'medium' | 'low'>('high');
  const [motivationNotes, setMotivationNotes] = useState("");

  const handleOpenCreateGoal = async () => {
    // Fetch user's approved skills for goal creation
    if (profile?.user_id) {
      const { data: userSkillsData } = await supabase
        .from('user_skills')
        .select(`
          skill_id,
          rating,
          skill:skills (
            id,
            name
          )
        `)
        .eq('user_id', profile.user_id)
        .eq('status', 'approved');
      
      setAvailableSkills(userSkillsData || []);
    }
    setShowCreateGoal(true);
  };

  const handleCreateGoal = async () => {
    if (!profile?.user_id || !selectedSkill || !selectedDate) return;
    
    try {
      const userSkill = availableSkills.find(us => us.skill_id === selectedSkill);
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
        title: "🎯 Goal Created!",
        description: "Your new goal has been set! +10 XP awarded",
      });
      
      setShowCreateGoal(false);
      setSelectedSkill("");
      setTargetRating('high');
      setMotivationNotes("");
      setSelectedDate(undefined);
      
      refreshGoals();
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

  const getStatusColor = (goal: any) => {
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
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Loading your goals...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* XP and Level Display */}
      {gamification && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-bold text-xl text-purple-900">Level {gamification.level}</p>
                  <p className="text-purple-700">{gamification.total_xp} XP</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🔥</span>
                  <span className="font-semibold text-purple-900">{gamification.current_streak}</span>
                </div>
                <p className="text-sm text-purple-700">goal streak</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Goals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                My Active Goals ({activeGoals.length})
              </CardTitle>
              <CardDescription>
                Track your skill improvement journey
              </CardDescription>
            </div>
            <Dialog open={showCreateGoal} onOpenChange={setShowCreateGoal}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenCreateGoal}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[min(448px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>🎯 Create Personal Goal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="skill">Skill</Label>
                    <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select skill to improve" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSkills
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
        <CardContent>
          {activeGoals.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Active Goals</h3>
              <p className="text-muted-foreground mb-4">Set your first skill goal to start tracking progress!</p>
              <Button onClick={handleOpenCreateGoal}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Goal
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeGoals.map((goal) => (
                <div key={goal.id} className="p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{goal.skill?.name}</h4>
                      <p className="text-sm text-muted-foreground">{goal.motivation_notes}</p>
                    </div>
                    <Badge variant="outline" className={getStatusColor(goal)}>
                      {getDaysRemaining(goal.target_date)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <Badge variant="outline" className={getRatingColor(goal.current_rating)}>
                      Current: {goal.current_rating}
                    </Badge>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline" className={getRatingColor(goal.target_rating)}>
                      Target: {goal.target_rating}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span className="font-semibold">{goal.progress_percentage}%</span>
                    </div>
                    <Progress value={goal.progress_percentage} className="h-3" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overdue Goals */}
      {overdueGoals.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Overdue Goals ({overdueGoals.length})
            </CardTitle>
            <CardDescription className="text-red-700">
              Don't give up! You can still achieve these goals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {overdueGoals.map((goal) => (
                <div key={goal.id} className="p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-red-900">{goal.skill?.name}</h4>
                      <p className="text-sm text-red-700">Keep pushing! Every step counts! 💪</p>
                    </div>
                    <Badge variant="outline" className="text-red-600 bg-red-100 border-red-300">
                      {getDaysRemaining(goal.target_date)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-red-700">Progress</span>
                      <span className="font-semibold text-red-900">{goal.progress_percentage}%</span>
                    </div>
                    <Progress value={goal.progress_percentage} className="h-3" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <Trophy className="h-5 w-5" />
              Achievements ({completedGoals.length})
            </CardTitle>
            <CardDescription className="text-emerald-700">
              Celebrate your successful goals!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {completedGoals.map((goal) => (
                <div key={goal.id} className="p-3 border border-emerald-200 rounded-lg bg-emerald-50">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="h-4 w-4 text-emerald-600" />
                    <h4 className="font-semibold text-emerald-900">{goal.skill?.name}</h4>
                  </div>
                  <p className="text-xs text-emerald-700">
                    Completed {goal.completed_at ? dateFormatters.formatDate(goal.completed_at) : ''}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};