const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Subir imagen a Cloudinary (uso actual: ASST)
const subirImagen = async (base64Image, folder = 'toma5asst') => {
  try {
    const resultado = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      resource_type: 'image',
      format: 'jpg',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' },
        { quality: 'auto' },
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

// Subir PDF a Cloudinary (uso: procedimientos)
const subirPdf = async (base64Pdf, nombreArchivo) => {
  try {
    const resultado = await cloudinary.uploader.upload(base64Pdf, {
      folder: 'toma5procedimientos',
      resource_type: 'raw',
      public_id: nombreArchivo,
      format: 'pdf',
      type: 'upload',
    });

    // Construir URL de descarga directa pública
    const urlPublica = resultado.secure_url.replace('/raw/upload/', '/raw/upload/fl_attachment/');

    return {
      url: urlPublica,
      publicId: resultado.public_id,
    };
  } catch (error) {
    console.error('Error al subir PDF a Cloudinary:', error);
    throw new Error('Error al subir el PDF');
  }
};


// Eliminar archivo de Cloudinary
const eliminarArchivo = async (publicId, resourceType = 'image') => {
  try {
    const resultado = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return resultado;
  } catch (error) {
    console.error('Error al eliminar archivo de Cloudinary:', error);
    throw new Error('Error al eliminar el archivo');
  }
};

module.exports = { subirImagen, subirPdf, eliminarArchivo, cloudinary };
