import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, Eye } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import type { GeneratedReport, ExportFormat } from "../types/reportTypes";
import { useReportsData } from "../hooks/useReportsData";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { useState } from "react";
import { dateFormatters } from "@/utils/formatters";

interface ReportResultsProps {
  report: GeneratedReport | null;
  onExport?: (format: ExportFormat) => void;
  onRegenerateReport?: () => void;
  loading?: boolean;
}

export function ReportResults({ report, onExport, onRegenerateReport, loading }: ReportResultsProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const { exportReport } = useReportsData();

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-center gap-2">
            <CardTitle>Generating Report...</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card className="w-full">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a report to generate and view results here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleExport = async (format: ExportFormat) => {
    setExporting(format);
    try {
      if (onExport) {
        await onExport(format);
      } else {
        await exportReport(report, format);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  // Process data for chart display
  const chartData = report.data.charts?.[0]?.data || [];
  
  // Convert flat rows array to structured table data
  const tableData = [];
  const headers = report.data.headers;
  for (let i = 0; i < report.data.rows.length; i += headers.length) {
    const rowData: Record<string, any> = {};
    headers.forEach((header, index) => {
      rowData[header] = report.data.rows[i + index];
    });
    tableData.push(rowData);
  }

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-xl">{report.name}</CardTitle>
              <CardDescription>
                Generated on {dateFormatters.formatDateTime(report.generated_at)} • {tableData.length} records
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{report.type}</Badge>
              {onRegenerateReport && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onRegenerateReport}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
              )}
              <div className="flex gap-1">
                {(['csv', 'xlsx', 'pdf'] as ExportFormat[]).map((format) => (
                  <Button
                    key={format}
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport(format)}
                    disabled={exporting !== null}
                    className="gap-2"
                  >
                    {exporting === format ? (
                      <LoadingSpinner showText={false} />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Visual Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey={report.data.charts?.[0]?.xAxisKey || 'category'} 
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey={report.data.charts?.[0]?.yAxisKey || 'value'} 
                    fill="hsl(var(--primary))" 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Results</CardTitle>
          <CardDescription>
            {tableData.length} records found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (
                    <TableHead key={header} className="whitespace-nowrap">
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length > 0 ? (
                  tableData.map((row, index) => (
                    <TableRow key={index}>
                      {headers.map((header) => (
                        <TableCell key={header} className="whitespace-nowrap">
                          {row[header]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell 
                      colSpan={headers.length} 
                      className="text-center py-8 text-muted-foreground"
                    >
                      No data available for the selected criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}