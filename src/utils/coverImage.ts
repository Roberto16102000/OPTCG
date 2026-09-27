import { Platform } from 'react-native';

/**
 * Lado mayor de la portada guardada. La foto se reescala antes de guardarla
 * porque AsyncStorage en web es `localStorage`: una foto de móvil sin tocar
 * (varios MB en base64) llenaría la cuota y rompería el guardado del binder.
 */
const MAX_SIDE = 1000;
const QUALITY = 0.8;

export interface PickedCover {
  uri: string;
  /** Ancho/alto de la foto guardada; hace falta para acotar el encuadre. */
  aspect: number;
}

/**
 * Abre el selector de archivos y devuelve la foto ya reescalada, o `null` si
 * se cancela. Solo web: en nativo haría falta expo-image-picker.
 */
export async function pickCoverImage(): Promise<PickedCover | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;

  const file = await chooseFile();
  if (!file) return null;

  const source = await readAsImage(file);
  return downscale(source);
}

function chooseFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);

    const finish = (file: File | null) => {
      input.remove();
      resolve(file);
    };

    input.addEventListener('change', () => finish(input.files?.[0] ?? null), { once: true });
    // Cancelar no dispara 'change' en todos los navegadores; 'cancel' sí donde
    // existe, y el foco de vuelta cubre al resto.
    input.addEventListener('cancel', () => finish(null), { once: true });
    input.click();
  });
}

function readAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('El archivo no es una imagen válida'));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Limita el tamaño conservando la proporción original. No se recorta a una
 * forma fija: la hoja del binder cambia de proporción con la rejilla y con el
 * ancho de la pantalla, así que recortar aquí obligaría a recortar otra vez al
 * pintarla. Se guarda la foto entera y es la hoja la que la encuadra.
 */
function downscale(img: HTMLImageElement): PickedCover {
  const longest = Math.max(img.width, img.height);
  const scale = longest > MAX_SIDE ? MAX_SIDE / longest : 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const aspect = width / height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { uri: img.src, aspect };
  ctx.drawImage(img, 0, 0, width, height);
  return { uri: canvas.toDataURL('image/jpeg', QUALITY), aspect };
}
