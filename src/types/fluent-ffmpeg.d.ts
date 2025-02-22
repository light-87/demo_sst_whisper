declare module 'fluent-ffmpeg' {
    function ffmpeg(input?: string): FfmpegCommand;
    namespace ffmpeg {
        function setFfmpegPath(path: string): void;
    }
    
    interface FfmpegCommand {
        audioChannels(count: number): FfmpegCommand;
        audioFrequency(freq: number): FfmpegCommand;
        audioCodec(codec: string): FfmpegCommand;
        format(format: string): FfmpegCommand;
        on(event: 'end', callback: () => void): FfmpegCommand;
        on(event: 'error', callback: (err: Error) => void): FfmpegCommand;
        save(output: string): FfmpegCommand;
    }
    
    export = ffmpeg;
} 