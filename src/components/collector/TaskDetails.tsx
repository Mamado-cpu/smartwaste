import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import MapView from '@/components/ui/map-view';

interface TaskDetailsProps {
  task: any | null;
  open: boolean;
  onClose: () => void;
}

const TaskDetails: React.FC<TaskDetailsProps> = ({ task, open, onClose }) => {
  if (!task) return null;

  const lat = task.locationLat || task.latitude || task.location?.lat || task.locationLat;
  const lng = task.locationLng || task.longitude || task.location?.lng || task.locationLng;

  // Normalize reporter/booker name and phone across possible payload shapes
  const reporterName =
    task.user?.fullName || task.user?.name || task.residentName || task.userId?.fullName || task.userId?.name || task.reporterName || (task.raw && (task.raw.userId?.fullName || task.raw.userId?.name)) || 'Unknown';

  const reporterPhone =
    task.user?.phone || task.userId?.phone || task.reporterPhone || task.phone || (task.raw && (task.raw.userId?.phone || task.raw.phone)) || 'N/A';

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>Details for the selected task</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="font-medium">Name: {reporterName}</p>
          <p className="text-sm text-muted-foreground">Phone: {reporterPhone}</p>

          <p className="mt-2">Type: {task.type === 'booking' ? `Booking (${task.source || task.serviceType || 'unknown'})` : 'Report'}</p>
          <p className="mt-2">Status: {task.status}</p>
          <p className="mt-2">Description: {task.details || task.description || task.notes || ''}</p>
        </div>

        {lat && lng ? (
          <div className="h-64 rounded-md overflow-hidden">
            <MapView center={[Number(lat), Number(lng)] as [number, number]} zoom={14} markers={[{
              position: [Number(lat), Number(lng)], title: task.user?.fullName || 'Resident', description: task.details || task.description,
              id: ''
            }]} />
          </div>
        ) : null}

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDetails;
