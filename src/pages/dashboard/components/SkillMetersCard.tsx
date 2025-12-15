import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, Target, Clock, TrendingUp, TrendingDown, Minus, Award } from "lucide-react";
import { useSkillMeters } from "../hooks/useSkillMeters";
import { ApprovedRatingsModal } from "./ApprovedRatingsModal";
import { useAuth } from "@/hooks/useAuth";
export const SkillMetersCard = () => {
  const { metersData, loading } = useSkillMeters();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const calculateCategoryScore = (breakdown: { high: number; medium: number; low: number; unrated: number }) => {
    const totalItems = breakdown.high + breakdown.medium + breakdown.low + breakdown.unrated;
    if (totalItems === 0) return 0;
    
    // Points-based scoring: High=5, Medium=3, Low=1
    const userPoints = (breakdown.high * 5) + (breakdown.medium * 3) + (breakdown.low * 1);
    const maxPossiblePoints = totalItems * 5; // All items could be rated High (5 points each)
    
    return Math.round((userPoints / maxPossiblePoints) * 100);
  };

  const getStatusFromPercentage = (percentage: number) => {
    if (percentage >= 80) return { status: 'Expert', color: 'bg-green-500 text-white', bgTint: 'bg-green-50 border-green-200' };
    if (percentage >= 40) return { status: 'Moderate', color: 'bg-yellow-500 text-white', bgTint: 'bg-yellow-50 border-yellow-200' };
    return { status: 'Beginner', color: 'bg-red-500 text-white', bgTint: 'bg-red-50 border-red-200' };
  };

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };
  const getRelativeTime = (timestamp?: string) => {
    if (!timestamp) return 'Not updated yet';
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  };
  if (loading) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Skill Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Loading skill meters...</p>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Skill Progress
            </CardTitle>
          </div>
          {metersData.overallGrowth > 0 && <div className="text-right">
              {/* Growth indicator */}
            </div>}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Overall Summary */}
        {metersData.xpGained > 0 && <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">+{metersData.xpGained} XP Earned</span>
              </div>
              {metersData.badges.length > 0 && <Badge variant="outline" className="text-primary border-primary/30">
                  {metersData.badges.length} new badge{metersData.badges.length > 1 ? 's' : ''}
                </Badge>}
            </div>
          </div>}

        {/* Category Meters */}
        {metersData.categoryMeters.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Target className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No skill categories found</p>
              <p className="text-xs text-muted-foreground">
                Complete skill assessments to see your progress
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {metersData.categoryMeters
                .map(meter => ({
                  ...meter,
                  score: calculateCategoryScore(meter.breakdown)
                }))
                .sort((a, b) => b.score - a.score)
                .map(meter => {
                  const status = getStatusFromPercentage(meter.score);
                  const isExpanded = expandedCategories.has(meter.categoryId);
                  const ratedCount = meter.breakdown.high + meter.breakdown.medium + meter.breakdown.low;
                  const totalSkills = ratedCount + meter.breakdown.unrated;

                  return (
                    <Card key={meter.categoryId} className={`transition-all duration-300 ${status.bgTint}`}>
                      {/* Collapsed View */}
                      <CardHeader 
                        className="cursor-pointer hover:bg-white/50 transition-colors"
                        onClick={() => toggleExpanded(meter.categoryId)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-foreground">
                              {meter.categoryName}
                            </CardTitle>
                            <div className="text-sm text-muted-foreground mt-1">
                              {ratedCount}/{totalSkills} skills • {meter.score}% complete
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${status.color} font-medium`}>
                              {status.status}
                            </Badge>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {/* Expanded View */}
                      {isExpanded && (
                        <CardContent className="pt-0 space-y-4">
                          {/* Score and Progress */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">Score</span>
                              <span className="font-semibold">{meter.score}%</span>
                            </div>
                            <Progress 
                              value={meter.score} 
                              className="h-3"
                            />
                          </div>

                          {/* Points Breakdown */}
                          <div className="bg-white/50 rounded-lg p-3">
                            <div className="text-sm font-medium text-foreground mb-2">Points Breakdown</div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-green-600">High (5 pts each):</span>
                                <span>{meter.breakdown.high} × 5 = {meter.breakdown.high * 5} pts</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-yellow-600">Medium (3 pts each):</span>
                                <span>{meter.breakdown.medium} × 3 = {meter.breakdown.medium * 3} pts</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-600">Low (1 pt each):</span>
                                <span>{meter.breakdown.low} × 1 = {meter.breakdown.low * 1} pts</span>
                              </div>
                              <div className="border-t pt-1 flex justify-between font-medium">
                                <span>Total:</span>
                                <span>{(meter.breakdown.high * 5) + (meter.breakdown.medium * 3) + (meter.breakdown.low * 1)} / {totalSkills * 5} pts</span>
                              </div>
                            </div>
                          </div>

                          {/* Subskill Summary */}
                          <div className="bg-white/50 rounded-lg p-3">
                            <div className="text-sm font-medium text-foreground mb-2">Subskill Summary</div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-center">
                                <div className="text-green-600 font-semibold">{meter.breakdown.high}</div>
                                <div className="text-muted-foreground">High</div>
                              </div>
                              <div className="text-center">
                                <div className="text-yellow-600 font-semibold">{meter.breakdown.medium}</div>
                                <div className="text-muted-foreground">Medium</div>
                              </div>
                              <div className="text-center">
                                <div className="text-red-600 font-semibold">{meter.breakdown.low}</div>
                                <div className="text-muted-foreground">Low</div>
                              </div>
                            </div>
                            {meter.breakdown.unrated > 0 && (
                              <div className="mt-2 text-center">
                                <div className="text-muted-foreground text-xs">
                                  {meter.breakdown.unrated} unrated skills
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Last Updated */}
                          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>Last updated {getRelativeTime()}</span>
                          </div>

                          {/* View Details Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategory({
                                id: meter.categoryId,
                                name: meter.categoryName
                              });
                            }}
                            className="w-full mt-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                          >
                            View Update/Approval History
                          </button>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
            </div>
          </div>
        )}

        {/* Approved Ratings Modal */}
        <ApprovedRatingsModal isOpen={!!selectedCategory} onClose={() => setSelectedCategory(null)} categoryId={selectedCategory?.id || ''} categoryName={selectedCategory?.name || ''} />
      </CardContent>
    </Card>;
};