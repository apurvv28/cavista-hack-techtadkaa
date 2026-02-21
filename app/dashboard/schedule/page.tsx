"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Video, Building2, UserCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function ScheduleAppointmentPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const convexUser = useQuery(api.users.getUser, user?.id ? { clerkId: user.id } : "skip");
  const doctors = useQuery(api.users.getDoctors);
  const bookAppointment = useMutation(api.appointments.bookAppointment);

  const [selectedDoctor, setSelectedDoctor] = useState<Id<"users"> | null>(null);
  const [consultationType, setConsultationType] = useState<"online" | "offline" | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock available times for today
  const timeSlots = ["10:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"];

  if (!isLoaded || doctors === undefined || convexUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSchedule = async () => {
    if (!selectedDoctor || !consultationType || !selectedTime || !convexUser) return;
    
    setIsSubmitting(true);
    try {
      // Create a mock ISO string for the selected time today
      const now = new Date();
      // just a mock timestamp
      const scheduledAt = new Date(now.toDateString() + " " + selectedTime).toISOString();
      
      await bookAppointment({
        patientId: convexUser._id,
        doctorId: selectedDoctor,
        type: consultationType,
        scheduledAt: scheduledAt,
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to book appointment", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-6 md:p-12 lg:pt-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div>
           <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
              <Clock className="w-6 h-6 text-primary" />
            </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Schedule Appointment</h1>
          <p className="text-zinc-500 mt-2">Choose a specialist and consultation preference.</p>
        </div>

        <div className="space-y-8">
          {/* Step 1: Choose Doctor */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">1. Select Doctor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((doc) => (
                <Card 
                  key={doc._id}
                  className={`cursor-pointer transition-all border-2 ${selectedDoctor === doc._id ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-transparent hover:border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm'}`}
                  onClick={() => setSelectedDoctor(doc._id)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                      <UserCircle className="w-8 h-8 text-zinc-600 dark:text-zinc-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-white">{doc.fullName || "Unnamed Doctor"}</p>
                      <p className="text-sm text-zinc-500">General Physician</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {doctors.length === 0 && (
                <div className="text-zinc-500 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 col-span-2 text-center">
                  No doctors available currently.
                </div>
              )}
            </div>
          </section>

          {/* Step 2: Consultation Type */}
          {selectedDoctor && (
            <section>
              <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">2. Consultation Type</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card 
                  className={`cursor-pointer transition-all border-2 ${consultationType === 'online' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-transparent hover:border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm'}`}
                  onClick={() => setConsultationType("online")}
                >
                  <CardContent className="p-6 flex flex-col justify-center items-center text-center gap-3">
                    <div className={`p-4 rounded-full ${consultationType === 'online' ? 'bg-primary/20' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                      <Video className={`w-8 h-8 ${consultationType === 'online' ? 'text-primary' : 'text-zinc-500'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-white">Online Video Call</p>
                      <p className="text-sm text-zinc-500 mt-1">Consult from anywhere</p>
                    </div>
                  </CardContent>
                </Card>
                <Card 
                  className={`cursor-pointer transition-all border-2 ${consultationType === 'offline' ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-transparent hover:border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm'}`}
                  onClick={() => setConsultationType("offline")}
                >
                  <CardContent className="p-6 flex flex-col justify-center items-center text-center gap-3">
                    <div className={`p-4 rounded-full ${consultationType === 'offline' ? 'bg-primary/20' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                      <Building2 className={`w-8 h-8 ${consultationType === 'offline' ? 'text-primary' : 'text-zinc-500'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 dark:text-white">In-Person Visit</p>
                      <p className="text-sm text-zinc-500 mt-1">Visit the clinic directly</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}

          {/* Step 3: Select Time */}
          {consultationType && (
            <section>
              <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">3. Select Time</h2>
              <div className="flex flex-wrap gap-3">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    className={selectedTime === time ? "bg-primary text-white" : "bg-white dark:bg-zinc-900"}
                    onClick={() => setSelectedTime(time)}
                    size="lg"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {time}
                  </Button>
                ))}
              </div>
            </section>
          )}

          {/* Step 4: Confirm */}
          {selectedTime && (
            <section className="pt-8 border-t border-zinc-200 dark:border-zinc-800">
              <Button 
                className="w-full md:w-auto px-12 h-14 text-lg bg-primary hover:bg-primary/90 text-white font-medium shadow-lg hover:shadow-xl transition-all" 
                onClick={handleSchedule}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                    Confirming Reservation...
                  </>
                ) : (
                  "Confirm Appointment"
                )}
              </Button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
