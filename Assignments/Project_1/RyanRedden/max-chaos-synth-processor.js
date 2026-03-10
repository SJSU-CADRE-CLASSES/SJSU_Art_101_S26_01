class MaxChaosSynthProcessor extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [
            { name: 'carrierHz', defaultValue: 220, minValue: 0, maxValue: 24000, automationRate: 'a-rate' },
            { name: 'depthHz', defaultValue: 1000, minValue: 0, maxValue: 50000, automationRate: 'a-rate' },
            { name: 'interpSec', defaultValue: 0.08, minValue: 0.001, maxValue: 2.0, automationRate: 'k-rate' },
            { name: 'smoothMode', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
            { name: 'b', defaultValue: 0.19, minValue: 0.00001, maxValue: 2.0, automationRate: 'k-rate' },
            { name: 'dt', defaultValue: 0.1, minValue: 0.000001, maxValue: 5.0, automationRate: 'k-rate' },
            { name: 'gainX', defaultValue: 1, minValue: 0.0, maxValue: 10.0, automationRate: 'k-rate' },
            { name: 'gainY', defaultValue: 1, minValue: 0.0, maxValue: 10.0, automationRate: 'k-rate' },
            { name: 'gainZ', defaultValue: 1, minValue: 0.0, maxValue: 10.0, automationRate: 'k-rate' },
            { name: 'muteX', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
            { name: 'muteY', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
            { name: 'muteZ', defaultValue: 1, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
            { name: 'mutePMX', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
            { name: 'mutePMY', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
            { name: 'mutePMZ', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' }
        ];
    }

    constructor() {
        super();

        this.x = (Math.random() * 2) - 1;
        this.y = (Math.random() * 2) - 1;
        this.z = (Math.random() * 2) - 1;

        this.phaseX = 0;
        this.phaseY = 0;
        this.phaseZ = 0;
        this.pmPhaseX = 0;
        this.pmPhaseY = (2 * Math.PI) / 3;
        this.pmPhaseZ = (4 * Math.PI) / 3;
        this.pmModPhaseX = 0;
        this.pmModPhaseY = (2 * Math.PI) / 5;
        this.pmModPhaseZ = (4 * Math.PI) / 5;

        this.smoothedCx = 0;
        this.smoothedCy = 0;
        this.smoothedCz = 0;

        this.stepHoldCx = 0;
        this.stepHoldCy = 0;
        this.stepHoldCz = 0;

        this.port.onmessage = (event) => {
            if (event && event.data && event.data.type === 'reset') {
                this.x = (Math.random() * 2) - 1;
                this.y = (Math.random() * 2) - 1;
                this.z = (Math.random() * 2) - 1;
            }
        };
    }

    derivatives(x, y, z, b) {
        return {
            dx: (-b * x) + Math.sin(y),
            dy: (-b * y) + Math.sin(z),
            dz: (-b * z) + Math.sin(x)
        };
    }

    stepThomas(dt, b, subSteps = 4) {
        const safeSubSteps = Math.max(1, subSteps | 0);
        const microDt = dt / safeSubSteps;

        for (let step = 0; step < safeSubSteps; step++) {
            const d = this.derivatives(this.x, this.y, this.z, b);
            this.x += d.dx * microDt;
            this.y += d.dy * microDt;
            this.z += d.dz * microDt;
        }
    }

    wrapPhase(phase) {
        const tau = Math.PI * 2;
        if (phase > tau || phase < -tau) {
            return phase % tau;
        }
        return phase;
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0];
        if (!output || output.length === 0) {
            return true;
        }

        const out = output[0];
        const blockSize = out.length;

        const carrierHzValues = parameters.carrierHz;
        const depthHzValues = parameters.depthHz;
        const interpSec = Math.max(0.001, parameters.interpSec[0]);
        const smoothMode = parameters.smoothMode[0] >= 0.5;
        const b = parameters.b[0];
        const dt = parameters.dt[0];
        const gainX = parameters.gainX[0];
        const gainY = parameters.gainY[0];
        const gainZ = parameters.gainZ[0];
        const muteX = parameters.muteX[0] >= 0.5 ? 1 : 0;
        const muteY = parameters.muteY[0] >= 0.5 ? 1 : 0;
        const muteZ = parameters.muteZ[0] >= 0.5 ? 1 : 0;
        const alpha = 1 - Math.exp(-1 / (interpSec * sampleRate));
        // Match prior engine semantics: dt was effectively applied around
        // stepsPerFrame * fps ≈ 20 * 60 = 1200 updates/sec, not 44.1k/sec.
        // Without this scaling, dt becomes ~36x stronger and sounds unstable.
        const refUpdatesPerSec = 1200;
        const sampleDt = (dt * refUpdatesPerSec) / sampleRate;
        const blockDt = sampleDt * blockSize;
        const phaseScale = (2 * Math.PI) / sampleRate;
        const activeVoices = muteX + muteY + muteZ;
        const voiceNorm = activeVoices > 0 ? (1 / activeVoices) : 0;

        if (!smoothMode) {
            this.stepThomas(blockDt, b, 8);
            this.stepHoldCx = this.x * gainX;
            this.stepHoldCy = this.y * gainY;
            this.stepHoldCz = this.z * gainZ;
        }

        for (let i = 0; i < blockSize; i++) {
            const carrierHz = carrierHzValues.length > 1 ? carrierHzValues[i] : carrierHzValues[0];
            const depthHz = depthHzValues.length > 1 ? depthHzValues[i] : depthHzValues[0];
            let cx;
            let cy;
            let cz;

            if (smoothMode) {
                this.stepThomas(sampleDt, b, 8);

                const targetCx = this.x * gainX;
                const targetCy = this.y * gainY;
                const targetCz = this.z * gainZ;

                this.smoothedCx += (targetCx - this.smoothedCx) * alpha;
                this.smoothedCy += (targetCy - this.smoothedCy) * alpha;
                this.smoothedCz += (targetCz - this.smoothedCz) * alpha;

                cx = this.smoothedCx;
                cy = this.smoothedCy;
                cz = this.smoothedCz;
            } else {
                cx = this.stepHoldCx;
                cy = this.stepHoldCy;
                cz = this.stepHoldCz;
            }

            const fx = carrierHz + (cx * depthHz);
            const fy = carrierHz + (cy * depthHz);
            const fz = carrierHz + (cz * depthHz);
            this.phaseX = this.wrapPhase(this.phaseX + (phaseScale * fx));
            this.phaseY = this.wrapPhase(this.phaseY + (phaseScale * fy));
            this.phaseZ = this.wrapPhase(this.phaseZ + (phaseScale * fz));

            out[i] =
                (
                    (muteX ? Math.sin(this.phaseX) : 0) +
                    (muteY ? Math.sin(this.phaseY) : 0) +
                    (muteZ ? Math.sin(this.phaseZ) : 0)
                ) * voiceNorm;
        }

        for (let ch = 1; ch < output.length; ch++) {
            output[ch].set(out);
        }

        return true;
    }
}

registerProcessor('max-chaos-synth-processor', MaxChaosSynthProcessor);
