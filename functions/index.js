const functions = require('firebase-functions');
const path = require('path');
const os = require('os');
const admin = require('firebase-admin');
const PDFExtract = require('pdf.js-extract').PDFExtract;
const pdfExtract = new PDFExtract();
admin.initializeApp({});


exports.metadata = functions.storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket; // The Storage bucket that contains the file.
  const filePath = object.name; // File path in the bucket.

  // Exit if this is triggered on a file that is not a pdf.
  if (!object.contentType.startsWith('application/pdf')) {
    console.log('This is not a pdf.');
    return null;
  }
  console.log(filePath)
  const fileName = path.basename(filePath);
  
  // Download file from bucket.
  const bucket = admin.storage().bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  const metadata = await bucket.file(filePath).getMetadata()
  console.log(metadata[0].metadata)
  await bucket.file(filePath).download({destination: tempFilePath});
  
  console.log('PDF downloaded locally to', tempFilePath);
  const options = {};
  return pdfExtract.extract(tempFilePath, options).then(async (data)=>{
    let content = ""
      for(let page=0; page<data.pages.length;page++){
        for(let line=0; line<data.pages[page].content.length; line++ ) {
          if (data.pages[page].content[line].str.trim()){
            content+=data.pages[page].content[line].str+"\n"
          }
        }
      }
      await admin.firestore().collection(metadata[0].metadata.user).doc(fileName).set({text:content});
      return true
  }).catch(err=>{
    console.log(err)
    return false
  })
});
  
  