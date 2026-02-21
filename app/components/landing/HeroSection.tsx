import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { ArrowRight, Activity, Shield, Brain, HeartPulse, Microscope, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import Image from "next/image";

export const HeroSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  
  // Smooth mouse tracking for parallax effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePosition({ x, y });
      mouseX.set(x);
      mouseY.set(y);
    }
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
    mouseX.set(0);
    mouseY.set(0);
  };

  // Transform values for parallax
  const backgroundX = useTransform(springX, [-0.5, 0.5], [-20, 20]);
  const backgroundY = useTransform(springY, [-0.5, 0.5], [-20, 20]);
  
  const titleRotateX = useTransform(springY, [-0.5, 0.5], [2, -2]);
  const titleRotateY = useTransform(springX, [-0.5, 0.5], [-2, 2]);

  // Medical terms array from your image
  const medicalTerms = [
    "CLINIC", "HOSPITAL", "PHARMAC", "THERAPY", 
    "MEDICINE", "HEALTH", "CAREE", "DOCTOR",
    "HEAL", "CARE", "MEDICAL", "FUNDAMENTUM",
    "PATIENT", "DIAGNOSIS", "TREATMENT", "SUPPORTIVE"
  ];

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden bg-gradient-to-br from-zinc-50 via-zinc-100/20 to-zinc-50 dark:from-zinc-950 dark:via-zinc-950/10 dark:to-zinc-950 pt-24 pb-32"
    >
      {/* Subtle medical pattern background */}
      <div className="absolute inset-0 z-0 opacity-[0.02] dark:opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L55 30 L30 55 L5 30 L30 5' stroke='%233B82F6' fill='none' stroke-width='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      {/* Animated gradient orbs */}
      <motion.div 
        className="absolute -top-48 -right-48 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div 
        className="absolute -bottom-48 -left-48 w-96 h-96 bg-zinc-500/5 rounded-full blur-3xl"
        animate={{
          x: [0, -50, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-left">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                rotateX: titleRotateX,
                rotateY: titleRotateY,
                perspective: 1000
              }}
            >
              <motion.div 
                className="mb-8 flex justify-start"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <motion.span 
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-primary/10 to-zinc-600/10 dark:from-primary/80/10 dark:to-zinc-400/10 px-5 py-2 text-sm font-semibold text-primary/90 dark:text-primary/60 ring-1 ring-primary/20 dark:ring-primary/80/30 backdrop-blur-sm border border-primary/40/20 dark:border-primary/90/30"
                  whileHover={{ 
                    boxShadow: "0 0 30px rgba(192, 54, 76, 0.3)",
                  }}
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Activity className="mr-2 h-4 w-4" />
                  </motion.div>
                  <span className="relative">
                    The Future of Healthcare Technology
                    <motion.span 
                      className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-primary to-zinc-600 rounded-full"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                    />
                  </span>
                </motion.span>
              </motion.div>
              
              <motion.h1 
                className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-white lg:text-7xl mb-6 relative"
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                Smart EMR & Diagnostic 
                <span className="relative inline-block">
                  Assistant
                  <motion.span 
                    className="absolute -bottom-3 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-zinc-600 rounded-full"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "100%", opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                  />
                </span>
              </motion.h1>
              
              <motion.p 
                className="text-lg leading-8 text-zinc-600 dark:text-zinc-300 mb-10 max-w-xl"
                whileHover={{ scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                Empowering healthcare professionals with AI-driven, real-time clinical workflows. 
                Spend less time documenting and more time caring for patients.
              </motion.p>

              <motion.div 
                className="flex flex-col sm:flex-row items-center justify-start gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Unauthenticated>
                  <SignUpButton mode="modal">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <Button 
                        size="lg" 
                        className="w-full sm:w-auto h-14 px-10 text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden group"
                      >
                        <motion.span 
                          className="absolute inset-0 bg-white/20"
                          initial={{ x: '-100%' }}
                          whileHover={{ x: '100%' }}
                          transition={{ duration: 0.5 }}
                        />
                        <span className="relative z-10 flex items-center text-lg">
                          Get Started 
                          <motion.div
                            animate={{ x: [0, 5, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                          >
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </motion.div>
                        </span>
                      </Button>
                    </motion.div>
                  </SignUpButton>
                  
                  <SignInButton mode="modal">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <Button 
                        size="lg" 
                        variant="outline" 
                        className="w-full sm:w-auto h-14 px-10 text-base rounded-full border-2 border-zinc-300 dark:border-zinc-700 hover:border-primary dark:hover:border-primary/80 hover:bg-zinc-100 dark:hover:bg-zinc-900/20 transition-all duration-300 relative overflow-hidden group"
                      >
                        <motion.span 
                          className="absolute inset-0 bg-gradient-to-r from-primary/5 to-zinc-600/5"
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                        <span className="relative z-10 flex items-center text-lg">
                          <Stethoscope className="mr-2 h-5 w-5" />
                          Login to EMR
                        </span>
                      </Button>
                    </motion.div>
                  </SignInButton>
                </Unauthenticated>

                <Authenticated>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <Button 
                      size="lg" 
                      className="w-full sm:w-auto h-14 px-10 text-base bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </motion.div>
                </Authenticated>
              </motion.div>

              {/* Trust indicators */}
              <motion.div 
                className="mt-12 flex items-center gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex -space-x-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-zinc-500 ring-2 ring-white dark:ring-zinc-900" />
                  ))}
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">10,000+</span> healthcare providers
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* Right Content - Staff of Asclepius */}
          <motion.div 
            className="hidden lg:flex justify-center items-center relative h-[600px]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <motion.div
              style={{
                x: useTransform(springX, [-0.5, 0.5], [-15, 15]),
                y: useTransform(springY, [-0.5, 0.5], [-15, 15]),
              }}
              className="relative z-20 flex items-center justify-center w-full h-full"
            >
              {/* Main symbol container */}
              <div className="relative w-[400px] h-[500px] flex items-center justify-center">

                {/* Staff of Asclepius - ACCURATE MEDICAL SYMBOL */}
                <div className="absolute top-[25px] left-[60px] z-30 drop-shadow-2xl">
                  <Image
                    src="/cadeceus.png"
                    alt="Caduceus Medical Symbol"
                    width={280}
                    height={450}
                    className="object-contain"
                    priority
                  />
                </div>

                {/* Floating particles */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-primary/80 dark:bg-primary"
                    style={{
                      left: '50%',
                      top: '50%',
                    }}
                    animate={{
                      x: Math.cos(i * 30 * Math.PI / 180) * 250,
                      y: Math.sin(i * 30 * Math.PI / 180) * 250,
                      scale: [0, 1, 0],
                      opacity: [0, 0.8, 0],
                    }}
                    transition={{
                      duration: 3,
                      delay: i * 0.2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-20 grid grid-cols-1 gap-4 sm:grid-cols-3 text-left"
        >
          {[
            { icon: Activity, text: "Real-time SOAP Generation", color: "blue", description: "AI-powered clinical documentation" },
            { icon: Shield, text: "Clinical Red-Flag Engine", color: "emerald", description: "Instant safety alerts" },
            { icon: Brain, text: "AI Hallucination Guard", color: "purple", description: "Verified medical accuracy" }
          ].map((feature, idx) => (
            <motion.div
              key={idx}
              onHoverStart={() => setHoveredFeature(idx)}
              onHoverEnd={() => setHoveredFeature(null)}
              whileHover={{ 
                scale: 1.05,
                y: -5,
                transition: { type: "spring", stiffness: 400, damping: 25 }
              }}
              className="relative group cursor-pointer"
            >
              <motion.div 
                className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 to-zinc-600/10 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300"
                animate={hoveredFeature === idx ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
              
              <div className="relative flex items-center gap-4 rounded-2xl bg-white/90 dark:bg-zinc-900/90 p-5 border border-zinc-200 dark:border-zinc-700 backdrop-blur-sm hover:border-primary/60 dark:hover:border-primary transition-all duration-300 shadow-xl hover:shadow-2xl">
                <motion.div 
                  className="flex bg-gradient-to-br from-primary/20 to-primary/40 dark:from-zinc-900/40 dark:to-primary/80/40 p-3 rounded-xl relative overflow-hidden"
                  whileHover={{ rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <motion.div 
                    className="absolute inset-0 bg-white/30"
                    animate={hoveredFeature === idx ? { 
                      rotate: [0, 360],
                      scale: [1, 1.5, 1],
                      opacity: [0, 0.3, 0]
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <feature.icon className="h-6 w-6 text-primary dark:text-primary/80 relative z-10" />
                </motion.div>
                
                <div className="flex flex-col">
                  <span className="text-base font-semibold text-zinc-800 dark:text-zinc-200">{feature.text}</span>
                  <motion.span 
                    className="text-sm text-zinc-500 dark:text-zinc-400"
                    initial={{ opacity: 0, height: 0 }}
                    animate={hoveredFeature === idx ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {feature.description}
                  </motion.span>
                </div>

                {/* Pulse indicator */}
                <motion.div 
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                  animate={hoveredFeature === idx ? {
                    scale: [1, 1.8, 1],
                    opacity: [1, 0.5, 1],
                    boxShadow: [
                      '0 0 0 0 rgba(192,54,76,0.7)',
                      '0 0 0 10px rgba(192,54,76,0)',
                      '0 0 0 0 rgba(192,54,76,0.7)'
                    ]
                  } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    background: idx === 0 ? '#c0364c' : idx === 1 ? '#52525b' : '#3f3f46'
                  }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};