import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import FormInput from '@/components/common/FormInput';
import FormSelect from '@/components/common/FormSelect';
import DatePickerInput from '@/components/common/DatePickerInput';
import { ProjectFormData, ProjectStatus } from '../../types/projects';
import { parseISO } from 'date-fns';

interface StepTwoProps {
  formData: ProjectFormData;
  setFormData: (data: ProjectFormData) => void;
  editMode?: boolean;
  currentStatus?: ProjectStatus;
  projectStatus?: string;
  setProjectStatus?: (status: string) => void;
  userRole?: string;
}

export default function StepTwo({ formData, setFormData, editMode, projectStatus, setProjectStatus, userRole }: StepTwoProps) {
  const statusOptions = [
    { value: 'awaiting_approval', label: 'Awaiting Approval' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const canChangeStatus = editMode && userRole && ['admin', 'management', 'tech_lead'].includes(userRole);
  
  // Get min date for end date (must be after start date)
  const startDateObj = formData.start_date ? parseISO(formData.start_date) : undefined;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
        <FormInput
          id="name"
          label="Project Name"
          value={formData.name}
          onChange={(value) => setFormData({ ...formData, name: value })}
          placeholder="Enter project name"
          required
        />

        <DatePickerInput
          id="start_date"
          label="Start Date"
          value={formData.start_date || ''}
          onChange={(value) => setFormData({ ...formData, start_date: value })}
          required
          className="w-[180px]"
          placeholder="Select date"
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
        <div className="space-y-1.5">
          <Label htmlFor="description" className="after:content-['*'] after:ml-0.5 after:text-red-500">
            Description
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe the project goals and scope"
            rows={3}
            className="text-sm"
          />
        </div>

        <DatePickerInput
          id="end_date"
          label="End Date (Optional)"
          value={formData.end_date || ''}
          onChange={(value) => setFormData({ ...formData, end_date: value })}
          className="w-[180px]"
          placeholder="Select date"
          minDate={startDateObj}
        />
      </div>

      {canChangeStatus && setProjectStatus && (
        <div className="mt-4">
          <FormSelect
            id="status"
            label="Project Status"
            value={projectStatus || 'active'}
            onChange={setProjectStatus}
            options={statusOptions}
            required
            className="z-50 relative"
          />
        </div>
      )}
    </div>
  );
}
