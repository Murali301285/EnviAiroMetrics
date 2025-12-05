import { motion } from 'framer-motion';

const Loader = () => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360],
                }}
                transition={{
                    duration: 2,
                    ease: "easeInOut",
                    times: [0, 0.5, 1],
                    repeat: Infinity,
                }}
                className="w-16 h-16 border-4 border-primary-color border-t-transparent rounded-full"
            />
        </div>
    );
};

export default Loader;
