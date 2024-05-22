const path = require('path');
const pdf = require('pdf-poppler');
const fs = require('fs');
const axios = require('axios');

// PDF 파일
const filePdf = 'comal.pdf';

// pdf 파일 이름
const output = filePdf.split('.')[0];

let pageCount = 0;

// OpenAI API Key - 팀 노션에 있음
const apiKey = "IN_THE_TEAM_NOTION";

// 변환된 파일 경로를 저장할 배열
let convertedFilePaths = [];

// pdf 정보를 가져오고 페이지 수를 정수로 변환
pdf.info(filePdf)
.then(pdfinfo => {
    pageCount = parseInt(pdfinfo.pages, 10);
    console.log(pdfinfo);
    console.log(`pdf파일 페이지 수: ${pageCount}`);

    // PDF 변환
    return pdf.convert(filePdf, {
        format: 'png',
        out_dir: path.join(path.dirname(filePdf), 'img'),
        out_prefix: output
    });
})
.then(res => {
    // 변환된 파일 경로를 배열에 저장
    for (let i = 1; i <= pageCount; i++) {
        const filePath = path.join(path.dirname(filePdf), 'img', `${output}-${i}.png`);
        convertedFilePaths.push({ filePath, pageNum: i });
    }
    console.log(`총 페이지 수: ${pageCount}`);
    console.log('저장된 파일 경로:', convertedFilePaths);
    
    // 변환된 파일 경로를 다른 함수에 전달하여 사용
    useConvertedFiles(convertedFilePaths);
})
.catch(error => console.error(error));

// 변환된 파일 경로를 사용하는 함수
async function useConvertedFiles(filePaths) {
    // 파일 경로 배열을 페이지 번호를 기준으로 오름차순 정렬
    filePaths.sort((a, b) => a.pageNum - b.pageNum);
    
    for (const { filePath, pageNum } of filePaths) {
        console.log(`\n변환된 파일 경로를 사용하는 함수에서: ${filePath} (페이지 ${pageNum})`);
        
        // Function to encode the image
        function encodeImage(imagePath) {
            const image = fs.readFileSync(imagePath);
            return Buffer.from(image).toString('base64');
        }
        
        // Getting the base64 string
        const base64Image = encodeImage(filePath);
        
        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        };
        
        const payload = {
            "model": "gpt-4o",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "시각장애인을 위해 이미지를 설명해줘. 300글자 안으로 간단하고 핵심만 설명해줘"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 300
        };
        
        try {
            const response = await axios.post("https://api.openai.com/v1/chat/completions", payload, { headers });
            console.log(`\n페이지 ${pageNum}에 대한 설명:`);
            console.log(response.data.choices[0].message.content);
        } catch (error) {
            console.error(`\n페이지 ${pageNum}에 대한 설명 생성 중 오류 발생:`);
            console.error(error);
        }
    }
}
