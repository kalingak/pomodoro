import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Play,
    Pause,
    RotateCcw,
    Settings,
    User,
    UserCheck,
    Clock,
    Coffee,
} from "lucide-react";

const PomodoroTimer = () => {
    // Timer state
    const [workTime, setWorkTime] = useState(30 * 60); // 30 minutes in seconds
    const [breakTime, setBreakTime] = useState(10 * 60); // 10 minutes in seconds
    const [currentTime, setCurrentTime] = useState(workTime);
    const [isActive, setIsActive] = useState(false);
    const [isWorkSession, setIsWorkSession] = useState(true);
    const [cycleCount, setCycleCount] = useState(0);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(
        null
    );

    // Position state
    const [currentPosition, setCurrentPosition] = useState("sitting"); // 'sitting' or 'standing'
    const [nextPosition, setNextPosition] = useState("standing");
    const [startingPosition, setStartingPosition] = useState("sitting");

    // UI state
    const [showSettings, setShowSettings] = useState(false);
    const [notificationPermission, setNotificationPermission] =
        useState("default");

    const timerRef = useRef<number | null>(null);

    // Request notification permission on mount
    useEffect(() => {
        if ("Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission().then((permission) => {
                    setNotificationPermission(permission);
                });
            } else {
                setNotificationPermission(Notification.permission);
            }
        }
    }, []);

    // Send notification
    const sendNotification = useCallback(
        (title: string, body: any, icon = "⏰") => {
            if (notificationPermission === "granted") {
                new Notification(title, {
                    body: body,
                    icon: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="0.9em" font-size="90">${icon}</text></svg>`,
                    requireInteraction: true,
                });
            }
        },
        [notificationPermission]
    );

    // Toggle position manually
    const togglePosition = useCallback(() => {
        const newPosition =
            currentPosition === "sitting" ? "standing" : "sitting";
        const newNext = newPosition === "sitting" ? "standing" : "sitting";
        setCurrentPosition(newPosition);
        setNextPosition(newNext);
    }, [currentPosition]);

    // Format time display
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
    };

    // Timer logic with background tab handling
    useEffect(() => {
        if (isActive) {
            const now = Date.now();

            // Set start time when timer becomes active
            if (!startTime) {
                setStartTime(now);
                setSessionStartTime(now);
            }

            timerRef.current = setInterval(() => {
                const currentNow = Date.now();
                const totalSessionTime = isWorkSession ? workTime : breakTime;
                const elapsedTime = Math.floor(
                    (currentNow - (sessionStartTime || now)) / 1000
                );
                const remainingTime = Math.max(
                    0,
                    totalSessionTime - elapsedTime
                );

                setCurrentTime(remainingTime);

                if (remainingTime <= 0) {
                    // Timer finished
                    const wasWorkSession = isWorkSession;

                    if (wasWorkSession) {
                        // Work session ended, start break
                        setIsWorkSession(false);
                        setCurrentTime(breakTime);
                        setCycleCount((prev) => prev + 1);
                        setSessionStartTime(currentNow);
                        sendNotification(
                            "🎉 Work Session Complete!",
                            `Time for a ${
                                breakTime / 60
                            } minute break. Switch to ${nextPosition}!`,
                            "☕"
                        );
                    } else {
                        // Break ended, start work
                        setIsWorkSession(true);
                        setCurrentTime(workTime);
                        setSessionStartTime(currentNow);
                        sendNotification(
                            "💪 Break Over!",
                            `Time to work for ${
                                workTime / 60
                            } minutes. Switch to ${nextPosition}!`,
                            "⚡"
                        );
                    }

                    // Switch positions for next session
                    setCurrentPosition(nextPosition);
                    setNextPosition(currentPosition);
                }
            }, 100); // Check every 100ms for better accuracy
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [
        isActive,
        isWorkSession,
        workTime,
        breakTime,
        currentPosition,
        nextPosition,
        sendNotification,
        startTime,
        sessionStartTime,
    ]);

    // Handle visibility change to sync timer when tab becomes active
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && isActive && sessionStartTime) {
                // Tab became visible, sync the timer
                const now = Date.now();
                const totalSessionTime = isWorkSession ? workTime : breakTime;
                const elapsedTime = Math.floor((now - sessionStartTime) / 1000);
                const remainingTime = Math.max(
                    0,
                    totalSessionTime - elapsedTime
                );

                setCurrentTime(remainingTime);

                // Check if session should have ended while in background
                if (remainingTime <= 0) {
                    const wasWorkSession = isWorkSession;

                    if (wasWorkSession) {
                        setIsWorkSession(false);
                        setCurrentTime(breakTime);
                        setCycleCount((prev) => prev + 1);
                        setSessionStartTime(now);
                        sendNotification(
                            "🎉 Work Session Complete!",
                            `Time for a ${
                                breakTime / 60
                            } minute break. Switch to ${nextPosition}!`,
                            "☕"
                        );
                    } else {
                        setIsWorkSession(true);
                        setCurrentTime(workTime);
                        setSessionStartTime(now);
                        sendNotification(
                            "💪 Break Over!",
                            `Time to work for ${
                                workTime / 60
                            } minutes. Switch to ${nextPosition}!`,
                            "⚡"
                        );
                    }

                    setCurrentPosition(nextPosition);
                    setNextPosition(currentPosition);
                }
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [
        isActive,
        isWorkSession,
        workTime,
        breakTime,
        sessionStartTime,
        currentPosition,
        nextPosition,
        sendNotification,
    ]);

    // Control functions
    const startTimer = () => {
        setIsActive(true);
        const now = Date.now();
        setStartTime(now);
        setSessionStartTime(now);
    };

    const pauseTimer = () => {
        setIsActive(false);
        setStartTime(null);
        setSessionStartTime(null);
    };

    const resetTimer = () => {
        setIsActive(false);
        setIsWorkSession(true);
        setCurrentTime(workTime);
        setCurrentPosition(startingPosition);
        setNextPosition(
            startingPosition === "sitting" ? "standing" : "sitting"
        );
        setCycleCount(0);
        setStartTime(null);
        setSessionStartTime(null);
    };

    // Settings handlers
    const updateWorkTime = (minutes: number) => {
        const seconds = minutes * 60;
        setWorkTime(seconds);
        if (isWorkSession && !isActive) {
            setCurrentTime(seconds);
        }
    };

    const updateBreakTime = (minutes: number) => {
        const seconds = minutes * 60;
        setBreakTime(seconds);
        if (!isWorkSession && !isActive) {
            setCurrentTime(seconds);
        }
    };

    const setInitialPosition = (position: React.SetStateAction<string>) => {
        setStartingPosition(position);
        setCurrentPosition(position);
        setNextPosition(position === "sitting" ? "standing" : "sitting");
    };

    // Calculate progress
    const totalTime = isWorkSession ? workTime : breakTime;
    const progress = ((totalTime - currentTime) / totalTime) * 100;

    return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Pomodoro Focus
                    </h1>
                    <p className="text-gray-400">Work smart, move often</p>
                </div>

                {/* Main Timer Card */}
                <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700 mb-6">
                    {/* Session Type & Position Status */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center space-x-2">
                            {isWorkSession ? (
                                <>
                                    <Clock className="w-5 h-5 text-blue-400" />
                                    <span className="text-blue-400 font-medium">
                                        Work Session
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Coffee className="w-5 h-5 text-orange-400" />
                                    <span className="text-orange-400 font-medium">
                                        Break Time
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-400">
                                Cycle #{cycleCount}
                            </div>
                        </div>
                    </div>

                    {/* Timer Display */}
                    <div className="text-center mb-8">
                        <div className="relative w-48 h-48 mx-auto mb-6">
                            {/* Progress Ring */}
                            <svg
                                className="w-full h-full transform -rotate-90"
                                viewBox="0 0 100 100"
                            >
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke="#374151"
                                    strokeWidth="4"
                                    fill="none"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke={
                                        isWorkSession ? "#3B82F6" : "#F97316"
                                    }
                                    strokeWidth="4"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 45}`}
                                    strokeDashoffset={`${
                                        2 * Math.PI * 45 * (1 - progress / 100)
                                    }`}
                                    className="transition-all duration-1000 ease-linear"
                                />
                            </svg>

                            {/* Timer Text */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="text-4xl font-mono font-bold">
                                        {formatTime(currentTime)}
                                    </div>
                                    <div className="text-sm text-gray-400 mt-1">
                                        {Math.round(progress)}% complete
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Position Indicator */}
                    <div className="flex items-center justify-center space-x-4 mb-6 p-4 bg-gray-700 rounded-xl">
                        <div className="text-center">
                            <div className="text-sm text-gray-400 mb-1">
                                Current Position
                            </div>
                            <div className="flex items-center space-x-2">
                                {currentPosition === "sitting" ? (
                                    <User className="w-6 h-6 text-blue-400" />
                                ) : (
                                    <UserCheck className="w-6 h-6 text-green-400" />
                                )}
                                <span className="font-medium capitalize">
                                    {currentPosition}
                                </span>
                            </div>
                        </div>
                        <div className="w-px h-12 bg-gray-600"></div>
                        <div className="text-center">
                            <div className="text-sm text-gray-400 mb-1">
                                Next Position
                            </div>
                            <div className="flex items-center space-x-2">
                                {nextPosition === "sitting" ? (
                                    <User className="w-6 h-6 text-gray-400" />
                                ) : (
                                    <UserCheck className="w-6 h-6 text-gray-400" />
                                )}
                                <span className="capitalize text-gray-300">
                                    {nextPosition}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Control Buttons */}
                    <div className="flex justify-center space-x-4 mb-4">
                        <button
                            onClick={isActive ? pauseTimer : startTimer}
                            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                                isActive
                                    ? "bg-red-600 hover:bg-red-700 text-white"
                                    : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                        >
                            {isActive ? (
                                <>
                                    <Pause className="w-5 h-5" />
                                    <span>Pause</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5" />
                                    <span>Start</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={resetTimer}
                            className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium bg-gray-600 hover:bg-gray-700 text-white transition-all"
                        >
                            <RotateCcw className="w-5 h-5" />
                            <span>Reset</span>
                        </button>
                    </div>

                    {/* Toggle Position Button */}
                    <button
                        onClick={togglePosition}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-xl font-medium bg-purple-600 hover:bg-purple-700 text-white transition-all"
                    >
                        <span>
                            Switch to{" "}
                            {currentPosition === "sitting"
                                ? "Standing"
                                : "Sitting"}
                        </span>
                    </button>
                </div>

                {/* Settings Toggle */}
                <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium bg-gray-700 hover:bg-gray-600 text-white transition-all mb-4"
                >
                    <Settings className="w-5 h-5" />
                    <span>Settings</span>
                </button>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700">
                        <h3 className="text-xl font-bold mb-4">Settings</h3>

                        {/* Timer Settings */}
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Work Time (minutes)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="90"
                                    value={workTime / 60}
                                    onChange={(e) =>
                                        updateWorkTime(
                                            parseInt(e.target.value) || 25
                                        )
                                    }
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Break Time (minutes)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={breakTime / 60}
                                    onChange={(e) =>
                                        updateBreakTime(
                                            parseInt(e.target.value) || 5
                                        )
                                    }
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Starting Position */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-300 mb-3">
                                Starting Position
                            </label>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() =>
                                        setInitialPosition("sitting")
                                    }
                                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all ${
                                        startingPosition === "sitting"
                                            ? "bg-blue-600 text-white"
                                            : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                                    }`}
                                >
                                    <User className="w-5 h-5" />
                                    <span>Sitting</span>
                                </button>
                                <button
                                    onClick={() =>
                                        setInitialPosition("standing")
                                    }
                                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl font-medium transition-all ${
                                        startingPosition === "standing"
                                            ? "bg-green-600 text-white"
                                            : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                                    }`}
                                >
                                    <UserCheck className="w-5 h-5" />
                                    <span>Standing</span>
                                </button>
                            </div>
                        </div>

                        {/* Notification Status */}
                        <div className="text-sm text-gray-400">
                            Notifications:{" "}
                            {notificationPermission === "granted"
                                ? "✅ Enabled"
                                : "❌ Disabled"}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PomodoroTimer;
