export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'Ready':
      return 'bg-green-100 text-green-800';
    case 'Processing':
      return 'bg-blue-100 text-blue-800';
    case 'Failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const generateReportFilename = (name: string, type: string): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  const cleanName = name.replace(/[^a-zA-Z0-9]/g, '_');
  return `${cleanName}_${timestamp}.pdf`;
};

export const isReportExpired = (generatedAt: string, expiryDays: number = 30): boolean => {
  const generated = new Date(generatedAt);
  const expiry = new Date(generated.getTime() + (expiryDays * 24 * 60 * 60 * 1000));
  return new Date() > expiry;
};