import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface FeatureCardProps {
  title: string;
  description: string;
  howItWorks: string;
  icon: LucideIcon;
  tier: string;
  badge?: string;
  delay?: number;
}

export const FeatureCard = ({ title, description, howItWorks, icon: Icon, tier, badge, delay = 0 }: FeatureCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <Card className="h-full border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden group">
        <CardContent className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-zinc-100 dark:bg-zinc-900/20 rounded-xl group-hover:bg-primary/20 dark:group-hover:bg-zinc-900/40 transition-colors">
              <Icon className="h-6 w-6 text-primary dark:text-primary/80" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="secondary" className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {tier}
              </Badge>
              {badge && (
                <Badge className="bg-zinc-100 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900/30 dark:text-zinc-400">
                  {badge}
                </Badge>
              )}
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">
            {title}
          </h3>
          
          <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6 flex-grow">
            {description}
          </p>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">
              How it works
            </span>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {howItWorks}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
