const cloudinary = require('cloudinary').v2;

// Configurar Cloudinary con las credenciales del .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Subir imagen a Cloudinary
 * @param {string} base64Image - Imagen en formato base64
 * @param {string} folder - Carpeta donde guardar la imagen
 * @returns {Promise<Object>} - Objeto con la URL de la imagen
 */
const subirImagen = async (base64Image, folder = 'toma5/asst') => {
  try {
    const resultado = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      resource_type: 'image',
      format: 'jpg',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // Limitar tamaño máximo
        { quality: 'auto' }, // Optimizar calidad automáticamente
      ],
    });

    return {
      url: resultado.secure_url,
      publicId: resultado.public_id,
    };
  } catch (error) {
    console.error('Error al subir imagen a Cloudinary:', error);
    throw new Error('Error al subir la imagen');
  }
};

/**
 * Eliminar imagen de Cloudinary
 * @param {string} publicId - ID público de la imagen
 * @returns {Promise<Object>} - Resultado de la eliminación
 */
const eliminarImagen = async (publicId) => {
  try {
    const resultado = await cloudinary.uploader.destroy(publicId);
    return resultado;
  } catch (error) {
    console.error('Error al eliminar imagen de Cloudinary:', error);
    throw new Error('Error al eliminar la imagen');
  }
};

module.exports = {
  subirImagen,
  eliminarImagen,
  cloudinary,
};
