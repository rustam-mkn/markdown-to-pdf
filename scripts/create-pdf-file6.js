const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function createVectorPDF(htmlFile, outputPdfPath) {
    console.log(`\nОбработка ${htmlFile}...`);
    
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Читаем HTML файл
    const fileUrl = 'file://' + path.resolve(htmlFile);
    await page.goto(fileUrl, { waitUntil: 'networkidle0' });
    
    // Получаем все карточки
    const cards = await page.evaluate(() => {
        const titleCards = Array.from(document.querySelectorAll('.card-title'));
        const regularCards = Array.from(document.querySelectorAll('.card'));
        const allCards = [...titleCards, ...regularCards];
        
        return allCards.map(card => {
            const rect = card.getBoundingClientRect();
            return {
                height: rect.height,
                width: rect.width
            };
        });
    });
    
    console.log(`Найдено ${cards.length} карточек`);
    
    // Создаем PDF с каждой карточкой на отдельной странице
    const pdfPages = [];
    
    for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        
        // Скрываем все карточки кроме текущей
        await page.evaluate((index) => {
            const titleCards = Array.from(document.querySelectorAll('.card-title'));
            const regularCards = Array.from(document.querySelectorAll('.card'));
            const allCards = [...titleCards, ...regularCards];
            
            allCards.forEach((c, idx) => {
                if (idx === index) {
                    c.style.display = c.classList.contains('card-title') ? 'flex' : 'block';
                    c.style.margin = '0';
                    c.style.pageBreakAfter = 'auto';
                } else {
                    c.style.display = 'none';
                }
            });
            
            // Убираем фон body
            document.body.style.background = 'white';
            document.body.style.margin = '0';
            document.body.style.padding = '0';
        }, i);
        
        // Генерируем PDF для этой карточки
        const pdfBuffer = await page.pdf({
            width: `${card.width}px`,
            height: `${card.height}px`,
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });
        
        pdfPages.push(pdfBuffer);
        console.log(`  Обработана карточка ${i + 1}/${cards.length}`);
    }
    
    await browser.close();
    
    // Объединяем все PDF страницы в один файл
    const { PDFDocument } = require('pdf-lib');
    const mergedPdf = await PDFDocument.create();
    
    for (const pdfBuffer of pdfPages) {
        const pdf = await PDFDocument.load(pdfBuffer);
        const [page] = await mergedPdf.copyPages(pdf, [0]);
        mergedPdf.addPage(page);
    }
    
    const mergedPdfBytes = await mergedPdf.save();
    fs.writeFileSync(outputPdfPath, mergedPdfBytes);
    
    console.log(`✓ Векторный PDF создан: ${outputPdfPath}`);
}

async function main() {
    const task = {
        html: 'source/html/file6_cards.html',
        outputPdf: 'dist/Модуль 4. Урок 2. Шаблон. Текст-заготовка для объявления.pdf'
    };
    
    await createVectorPDF(task.html, task.outputPdf);
    
    console.log('\n✓ Векторный PDF успешно создан!');
    console.log('\nПреимущества векторного PDF:');
    console.log('- Текст можно выделять и копировать');
    console.log('- Масштабируется без потери качества');
    console.log('- Карточки автоматически подстраиваются под контент');
}

main().catch(console.error);
