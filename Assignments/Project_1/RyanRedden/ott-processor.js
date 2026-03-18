class OTTProcessor extends AudioWorkletProcessor {
    constructor() {
        super();

        // High threshold: downward compression kicks in above this level
        this._highThreshold = -15;  // dB
        this._downRatio     = 4.0;  // 4:1 downward

        // Low threshold: upward compression kicks in below this level
        this._lowThreshold  = -40;  // dB
        this._upRatio       = 0.5;  // for every 1dB below threshold, raise by 0.5dB

        // One-pole lowpass envelope follower: 10ms attack, 120ms release
        this._attackCoeff  = Math.exp(-1 / (0.010 * sampleRate));
        this._releaseCoeff = Math.exp(-1 / (0.120 * sampleRate));

        // Start the smoothed gain at unity so there's no initial burst
        this._smoothedGain = 1.0;
    }

    process(inputs, outputs) {
        const input  = inputs[0];
        const output = outputs[0];

        if (!input || !input.length) return true;

        const numChannels = input.length;
        const blockSize   = input[0].length;

        // --- Envelope follower: RMS across all channels in this block ---
        let sumSq = 0;
        for (let c = 0; c < numChannels; c++) {
            for (let i = 0; i < blockSize; i++) {
                sumSq += input[c][i] * input[c][i];
            }
        }
        const rms   = Math.sqrt(sumSq / (numChannels * blockSize + 1e-12));
        const rmsDb = 20 * Math.log10(rms + 1e-10);

        // --- Gain computation (in dB) ---
        let gainDb = 0;

        if (rmsDb > this._highThreshold) {
            // Downward compression: clamp signals that are too loud
            // Above threshold each 1dB of excess becomes 1/ratio dB output
            gainDb = (this._highThreshold - rmsDb) * (1 - 1 / this._downRatio);
        } else if (rmsDb < this._lowThreshold) {
            // Upward compression: lift signals that are too quiet
            // Below threshold each 1dB of deficit is partially recovered
            gainDb = (this._lowThreshold - rmsDb) * this._upRatio;
        }

        const targetGain = Math.pow(10, gainDb / 20);

        // --- One-pole smoothing (attack faster than release) ---
        const coeff = targetGain < this._smoothedGain
            ? this._attackCoeff
            : this._releaseCoeff;
        this._smoothedGain = coeff * this._smoothedGain + (1 - coeff) * targetGain;

        // --- Apply gain to every sample ---
        for (let c = 0; c < numChannels; c++) {
            const inCh  = input[c];
            const outCh = output[c];
            for (let i = 0; i < blockSize; i++) {
                outCh[i] = inCh[i] * this._smoothedGain;
            }
        }

        return true;
    }
}

registerProcessor('ott-processor', OTTProcessor);
