"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import {
  Sparkles, User, BookOpen, CalendarDays, ArrowRight,
  CheckCircle2, ChevronRight
} from "lucide-react";

const STEPS = [
  {
    icon: User,
    title: "设置人设",
    description: "填写您的基本信息、风格偏好和目标受众，AI将根据人设生成个性化内容",
    gradient: "from-violet-500 to-purple-600",
    shadow: "shadow-violet-200 dark:shadow-violet-900/40",
  },
  {
    icon: BookOpen,
    title: "建立知识库",
    description: "添加专业知识、经验总结、故事素材等，让AI基于真实经历创作原创内容",
    gradient: "from-amber-500 to-orange-500",
    shadow: "shadow-amber-200 dark:shadow-amber-900/40",
  },
  {
    icon: CalendarDays,
    title: "生成内容计划",
    description: "一键AI生成30天发布计划，支持朋友圈和小红书双平台",
    gradient: "from-emerald-500 to-teal-500",
    shadow: "shadow-emerald-200 dark:shadow-emerald-900/40",
  },
];

interface WelcomeOnboardingProps {
  onComplete: () => void;
}

export function WelcomeOnboarding({ onComplete }: WelcomeOnboardingProps) {
  const { persona, knowledgeItems, setLeftPanelTab, platform, setPlatform } = useAppStore();
  const [currentStep, setCurrentStep] = useState(0);

  const stepStatuses = [
    !!persona?.name,
    knowledgeItems.length >= 2,
    false, // Will be completed after generation
  ];

  const completedSteps = stepStatuses.filter(Boolean).length;

  const handleStepClick = (index: number) => {
    if (index === 0) {
      setLeftPanelTab("persona");
    } else if (index === 1) {
      setLeftPanelTab("knowledge");
    }
  };

  const canStart = stepStatuses[0] && stepStatuses[1];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-[calc(100vh-7rem)] flex items-center justify-center p-4 sm:p-8"
    >
      <div className="max-w-lg w-full">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200 dark:shadow-violet-900/40">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">欢迎使用AI运营助手</h2>
          <p className="text-sm text-muted-foreground">
            三步开启您的个人IP运营之旅
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="space-y-3 mb-8">
          {STEPS.map((step, index) => {
            const isCompleted = stepStatuses[index];
            const isCurrent = !isCompleted && completedSteps === index;
            const StepIcon = step.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <Card
                  className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${
                    isCompleted ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                  } ${isCurrent ? "ring-2 ring-primary/20 bg-primary/[0.02]" : ""}`}
                  onClick={() => !isCompleted && handleStepClick(index)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-md ${step.shadow} shrink-0 ${
                      isCompleted ? "opacity-60" : ""
                    }`}>
                      {isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      ) : (
                        <StepIcon className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-semibold ${isCompleted ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                          {step.title}
                        </h3>
                        {isCompleted && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
                            已完成
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            进行中
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                    {!isCompleted && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Platform Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-2"
        >
          <p className="text-xs text-muted-foreground font-medium text-center">选择运营平台</p>
          <div className="grid grid-cols-2 gap-3">
            <Card
              onClick={() => setPlatform('wechat')}
              className={`h-20 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                platform === 'wechat'
                  ? 'ring-2 ring-primary border-primary'
                  : 'hover:border-green-300 dark:hover:border-green-700'
              }`}
            >
              <CardContent className="p-3 h-full flex flex-col items-center justify-center gap-1.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <span className="text-sm">🟢</span>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold">朋友圈</p>
                  <p className="text-[10px] text-muted-foreground">微信朋友圈内容运营</p>
                </div>
              </CardContent>
            </Card>
            <Card
              onClick={() => setPlatform('xiaohongshu')}
              className={`h-20 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                platform === 'xiaohongshu'
                  ? 'ring-2 ring-primary border-primary'
                  : 'hover:border-red-300 dark:hover:border-red-700'
              }`}
            >
              <CardContent className="p-3 h-full flex flex-col items-center justify-center gap-1.5">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                  <span className="text-sm">🔴</span>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold">小红书</p>
                  <p className="text-[10px] text-muted-foreground">小红书笔记内容运营</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-2"
        >
          <Button
            onClick={canStart ? onComplete : undefined}
            disabled={!canStart}
            className={`w-full h-11 ${
              canStart
                ? "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-200 dark:shadow-violet-900/40"
                : ""
            }`}
          >
            {canStart ? (
              <>
                开始使用
                <ArrowRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                完成前置步骤后开始
              </>
            )}
          </Button>
          {!canStart && (
            <p className="text-[11px] text-muted-foreground text-center">
              请先完成人设设置和知识库建立
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
