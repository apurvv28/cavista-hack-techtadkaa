import { Building2, ShieldEllipsis, Users, FileText } from "lucide-react";

const stats = [
  { id: 1, name: 'Hours saved per week', value: '15+', icon: Activity },
  { id: 2, name: 'Documentation accuracy', value: '99.9%', icon: ShieldCheck },
  { id: 3, name: 'Patients seen daily', value: '40+', icon: Users },
  { id: 4, name: 'ABDM Compliant', value: '100%', icon: Building2 },
];

export const TestimonialSection = () => {
  return (
    <div className="bg-white dark:bg-zinc-950 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-4xl mb-6">
              Trusted by Healthcare Professionals
            </h2>
            <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400 mb-16 max-w-2xl mx-auto">
              "The Hinglish voice recognition is a game-changer. I speak to my patients as I normally do, and the system generates a perfect English SOAP note instantly. It has given me my evenings back."
              <br />
              <span className="font-semibold text-zinc-900 dark:text-white mt-4 block">— Dr. Sharma, General Physician</span>
            </p>
          </div>
          
          <dl className="mt-16 grid grid-cols-1 gap-0.5 overflow-hidden rounded-2xl text-center sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.id} className="flex flex-col bg-zinc-50/50 dark:bg-zinc-900/50 p-8 border border-zinc-100 dark:border-zinc-800">
                <dt className="text-sm font-semibold leading-6 text-zinc-600 dark:text-zinc-400 flex flex-col items-center gap-3">
                  <stat.icon className="h-6 w-6 text-primary dark:text-primary/80" />
                  {stat.name}
                </dt>
                <dd className="order-first text-3xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};

// You need to add imports to top
import { Activity, ShieldCheck } from "lucide-react";
