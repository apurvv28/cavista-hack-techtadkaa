"use client";

import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type MedicineRow = {
  id: number;
  medicine: string;
  dosage: string;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
};

type PrescriptionFormProps = {
  embedded?: boolean;
  patientContext?: {
    patientId?: string;
    patientName?: string;
  };
};

export function PrescriptionForm({
  embedded = false,
  patientContext,
}: PrescriptionFormProps) {
  const { user } = useUser();
  const convexUser = useQuery(
    api.users.getUser,
    user?.id ? { clerkId: user.id } : "skip",
  );
  const savePrescriptionRecord = useMutation(api.users.savePrescriptionRecord);

  const [patientName, setPatientName] = useState(
    patientContext?.patientName || "",
  );
  const [patientAge, setPatientAge] = useState("");
  const [patientWeight, setPatientWeight] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [medicines, setMedicines] = useState<MedicineRow[]>([
    {
      id: 1,
      medicine: "",
      dosage: "",
      morning: false,
      afternoon: false,
      evening: false,
    },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const doctorName = user?.fullName || "Doctor";
  const doctorEmail = user?.primaryEmailAddress?.emailAddress || "-";
  const doctorPhone = useMemo(() => {
    if (!user?.phoneNumbers?.length) return "-";
    return user.phoneNumbers[0]?.phoneNumber || "-";
  }, [user]);

  const resolvedPatientId = patientContext?.patientId?.trim() || "";

  useEffect(() => {
    if (patientContext?.patientName) {
      setPatientName(patientContext.patientName);
    }
  }, [patientContext?.patientName]);

  const addMedicineRow = () => {
    setMedicines((previous) => [
      ...previous,
      {
        id: Date.now(),
        medicine: "",
        dosage: "",
        morning: false,
        afternoon: false,
        evening: false,
      },
    ]);
  };

  const removeMedicineRow = (id: number) => {
    setMedicines((previous) => {
      if (previous.length === 1) return previous;
      return previous.filter((medicine) => medicine.id !== id);
    });
  };

  const updateMedicine = (
    id: number,
    field: keyof Omit<MedicineRow, "id">,
    value: string | boolean,
  ) => {
    setMedicines((previous) =>
      previous.map((medicine) => {
        if (medicine.id !== id) return medicine;
        return {
          ...medicine,
          [field]: value,
        };
      }),
    );
  };

  const handleSavePrescription = async () => {
    setSaveMessage(null);
    setSaveError(null);

    if (!user?.id || !convexUser?._id) {
      setSaveError("Please sign in before saving prescription.");
      return;
    }

    if (!patientName.trim()) {
      setSaveError("Patient name is required.");
      return;
    }

    if (!resolvedPatientId) {
      setSaveError(
        "Patient ID is linked from consultation. Open this form from the active call.",
      );
      return;
    }

    const validMedicines = medicines
      .map((medicine) => ({
        medicine: medicine.medicine.trim(),
        dosage: medicine.dosage.trim(),
        morning: medicine.morning,
        afternoon: medicine.afternoon,
        evening: medicine.evening,
      }))
      .filter(
        (medicine) =>
          medicine.medicine ||
          medicine.dosage ||
          medicine.morning ||
          medicine.afternoon ||
          medicine.evening,
      );

    if (!validMedicines.length) {
      setSaveError("Please add at least one medicine entry.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/save-prescription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorName,
          doctorEmail,
          doctorPhone,
          patientId: resolvedPatientId,
          patientName: patientName.trim(),
          patientAge: patientAge.trim(),
          patientWeight: patientWeight.trim(),
          prescriptionDate,
          medicines: validMedicines,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.url) {
        throw new Error(
          result?.error || "Unable to upload prescription document.",
        );
      }

      await savePrescriptionRecord({
        doctorId: convexUser._id,
        doctorClerkId: user.id,
        doctorName,
        doctorEmail,
        patientId: resolvedPatientId,
        patientName: patientName.trim(),
        patientAge: patientAge.trim(),
        patientWeight: patientWeight.trim(),
        prescriptionDate,
        blobUrl: result.url,
        medicines: validMedicines,
      });

      setSaveMessage("Prescription saved successfully.");
    } catch (error: any) {
      setSaveError(error?.message || "Failed to save prescription.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={
        embedded
          ? "rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          : "bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800"
      }
    >
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
          Dr. {doctorName}
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Contact: {doctorEmail} | {doctorPhone}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Patient ID: {resolvedPatientId || "Not linked"}
        </p>
      </div>

      <div className="my-6 border-t border-zinc-200 dark:border-zinc-800" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Patient Name
            </label>
            <input
              value={patientName}
              onChange={(event) => setPatientName(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              placeholder="Enter patient name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Age
              </label>
              <input
                value={patientAge}
                onChange={(event) => setPatientAge(event.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                placeholder="Age"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Weight (kg)
              </label>
              <input
                value={patientWeight}
                onChange={(event) => setPatientWeight(event.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                placeholder="Weight"
              />
            </div>
          </div>
        </div>

        <div className="md:justify-self-end w-full md:max-w-xs">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Date
          </label>
          <input
            type="date"
            value={prescriptionDate}
            onChange={(event) => setPrescriptionDate(event.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          Prescription
        </h3>

        <div className="space-y-4">
          {medicines.map((medicine) => (
            <div
              key={medicine.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                <div className="lg:col-span-4">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Medicine
                  </label>
                  <input
                    value={medicine.medicine}
                    onChange={(event) =>
                      updateMedicine(
                        medicine.id,
                        "medicine",
                        event.target.value,
                      )
                    }
                    className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                    placeholder="Medicine name"
                  />
                </div>

                <div className="lg:col-span-3">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Dosage
                  </label>
                  <input
                    value={medicine.dosage}
                    onChange={(event) =>
                      updateMedicine(medicine.id, "dosage", event.target.value)
                    }
                    className="mt-1 w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
                    placeholder="e.g. 1 tablet"
                  />
                </div>

                <div className="lg:col-span-4">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-2">
                    Time of Day
                  </label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={medicine.morning}
                        onChange={(event) =>
                          updateMedicine(
                            medicine.id,
                            "morning",
                            event.target.checked,
                          )
                        }
                      />
                      Morning
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={medicine.afternoon}
                        onChange={(event) =>
                          updateMedicine(
                            medicine.id,
                            "afternoon",
                            event.target.checked,
                          )
                        }
                      />
                      Afternoon
                    </label>
                    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <input
                        type="checkbox"
                        checked={medicine.evening}
                        onChange={(event) =>
                          updateMedicine(
                            medicine.id,
                            "evening",
                            event.target.checked,
                          )
                        }
                      />
                      Evening
                    </label>
                  </div>
                </div>

                <div className="lg:col-span-1 flex lg:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeMedicineRow(medicine.id)}
                    disabled={medicines.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="text-zinc-900 hover:text-zinc-900 dark:text-zinc-100 dark:hover:text-zinc-100"
            onClick={addMedicineRow}
          >
            <Plus className="h-4 w-4" />
            Add Medicine
          </Button>
          <Button
            type="button"
            onClick={handleSavePrescription}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Prescription"
            )}
          </Button>
        </div>

        {saveMessage ? (
          <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {saveMessage}
          </p>
        ) : null}

        {saveError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {saveError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
