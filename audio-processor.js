// AudioWorklet для понижения частоты дискретизации с 48kHz до 16kHz
// и конвертации в PCM16 (Int16LE) формат для Vosk

class PCM16DownsamplerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    // Параметры
    this.targetSampleRate = options.processorOptions?.targetSampleRate || 16000;
    this.sourceSampleRate = sampleRate; // текущий sample rate AudioContext
    
    // Коэффициент понижения частоты
    this.downsampleRatio = this.sourceSampleRate / this.targetSampleRate;
    
    // Буфер для накопления данных
    this.inputBuffer = [];
    this.outputBuffer = [];
    
    // Счетчик для понижения частоты
    this.sampleCounter = 0;
    
    // Размер выходного чанка (в семплах)
    this.chunkSize = 1024; // ~64ms при 16kHz
    
    console.log(`PCM16 Downsampler: ${this.sourceSampleRate}Hz → ${this.targetSampleRate}Hz (ratio: ${this.downsampleRatio})`);
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    // Берем первый канал (моно)
    const inputData = input[0];
    
    // Понижение частоты дискретизации простым прореживанием
    for (let i = 0; i < inputData.length; i++) {
      this.sampleCounter += this.targetSampleRate;
      
      if (this.sampleCounter >= this.sourceSampleRate) {
        this.sampleCounter -= this.sourceSampleRate;
        
        // Конвертируем float32 [-1, 1] в int16 [-32768, 32767]
        let sample = Math.round(inputData[i] * 32767);
        
        // Ограничиваем значения
        sample = Math.max(-32768, Math.min(32767, sample));
        
        this.outputBuffer.push(sample);
        
        // Если накопили достаточно данных, отправляем чанк
        if (this.outputBuffer.length >= this.chunkSize) {
          this.sendChunk();
        }
      }
    }
    
    return true;
  }
  
  sendChunk() {
    if (this.outputBuffer.length === 0) {
      return;
    }
    
    // Создаем ArrayBuffer с Int16LE данными
    const arrayBuffer = new ArrayBuffer(this.outputBuffer.length * 2);
    const dataView = new DataView(arrayBuffer);
    
    for (let i = 0; i < this.outputBuffer.length; i++) {
      dataView.setInt16(i * 2, this.outputBuffer[i], true); // true = little endian
    }
    
    // Отправляем в main thread
    this.port.postMessage(arrayBuffer);
    
    // Очищаем буфер
    this.outputBuffer = [];
  }
}

registerProcessor('pcm16-downsampler', PCM16DownsamplerProcessor);
