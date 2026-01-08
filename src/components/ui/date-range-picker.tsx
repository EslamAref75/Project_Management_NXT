"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { addDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export interface DatePickerWithRangeProps {
    className?: string
    date?: DateRange
    setDate: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
    className,
    date,
    setDate,
}: DatePickerWithRangeProps) {
    const [isOpen, setIsOpen] = React.useState(false)

    const handlePresetChange = (value: string) => {
        const today = new Date()
        let from: Date | undefined
        let to: Date | undefined

        switch (value) {
            case "today":
                from = today
                to = today
                break
            case "yesterday":
                from = addDays(today, -1)
                to = addDays(today, -1)
                break
            case "this_week":
                from = startOfWeek(today)
                to = endOfWeek(today)
                break
            case "last_week":
                from = startOfWeek(addDays(today, -7))
                to = endOfWeek(addDays(today, -7))
                break
            case "this_month":
                from = startOfMonth(today)
                to = endOfMonth(today)
                break
            case "last_month":
                from = startOfMonth(subMonths(today, 1))
                to = endOfMonth(subMonths(today, 1))
                break
            case "this_year":
                from = startOfYear(today)
                to = endOfYear(today)
                break
            case "last_year":
                from = startOfYear(addDays(today, -365))
                to = endOfYear(addDays(today, -365))
                break
        }

        if (from && to) {
            setDate({ from, to })
        }
    }

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal h-9",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className={cn("mr-2 h-4 w-4", date?.from && "text-primary")} />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "MMM d, yyyy")} -{" "}
                                    {format(date.to, "MMM d, yyyy")}
                                </>
                            ) : (
                                format(date.from, "MMM d, yyyy")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-3 border-b space-y-2">
                        <Select onValueChange={handlePresetChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Quick Select" />
                            </SelectTrigger>
                            <SelectContent position="popper">
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="yesterday">Yesterday</SelectItem>
                                <SelectItem value="this_week">This Week</SelectItem>
                                <SelectItem value="last_week">Last Week</SelectItem>
                                <SelectItem value="this_month">This Month</SelectItem>
                                <SelectItem value="last_month">Last Month</SelectItem>
                                <SelectItem value="this_year">This Year</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
