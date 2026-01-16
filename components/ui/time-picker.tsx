'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

type TimePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

// Generate time slots in 30-minute increments (00:00 to 23:30)
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

// Format time for display (12-hour format with AM/PM)
const formatTimeDisplay = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export function TimePicker({ value, onChange, disabled, className }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full pl-3 text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {value ? formatTimeDisplay(value) : <span>Pick a time</span>}
          <Clock className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto p-1">
          {timeSlots.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => {
                onChange(time);
                setOpen(false);
              }}
              className={cn(
                'w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                value === time && 'bg-accent text-accent-foreground'
              )}
            >
              {formatTimeDisplay(time)}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
