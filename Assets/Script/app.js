const audioPlayer = document.getElementById('audioPlayer');
const selectedMusic = document.getElementById('selectedMusic');
let currentCordinateTime = [];
$(document).on("click", "td", function () {
    const data = `x:${Number($(this).data("x"))} y:${Number($(this).data("y"))}`
    const time = `${Math.floor(audioPlayer.currentTime / 60)}:${Math.floor(audioPlayer.currentTime % 60)}`;
    currentCordinateTime.push({ time, data });
    $(".cordinate-data").html(data);
    $(".time-data").html(time);
    $(".song-data").html($("#mediaPlayer .body .selected").text())
    console.log(data);
    $("#cordinateTable td").removeClass('selected');
    $(this).addClass('selected');
});

$(document).on("click", "#expandMediaBtn", function () {
    $("#mediaPlayer").slideToggle('fast', () => {
        if ($("#mediaPlayer").css('display') === 'block') {
            $(this).addClass('active');
        } else {
            $(this).removeClass('active');
        }
    });
});

$(document).on("click", ".expandData", function () {
    $(".dataContainer").slideToggle('fast', () => {
        if ($(".dataContainer").css('display') === 'block') {
            $(this).addClass('active');
        } else {
            $(this).removeClass('active');
        }
    });
});

$(document).on("click", ".media-track", function () {
    $("#selectedMusic").text($(this).attr('song-data'))
});

function selectSong(songFile, elem) {
    audioPlayer.src = `./Assets/Media/${songFile}`;
    selectedMusic.textContent = songFile.replace('_', ' ');
    // Resetting currentTime is handled by changing src, but we can ensure it starts from 0
    // audioPlayer.currentTime = 0; 
    $(".media-track").removeClass('selected');
    $(elem).addClass('selected');

    // Play immediately and handle potential promise rejections
    var playPromise = audioPlayer.play();
    if (playPromise !== undefined) {
        playPromise.then(_ => {
            // Automatic playback started!
        }).catch(error => {
            // Auto-play was prevented
            console.error("Playback failed:", error);
        });
    }
}

function playMusic() {
    audioPlayer.play();
}

function pauseMusic() {
    audioPlayer.pause();
}

$(document).ready(function () {
    // Song data embedded directly to avoid local file fetch (CORS) issues
    const files = [
        { "url": "müzik1.mp3", "title": "Müzik 1" },
        { "url": "müzik2.mp3", "title": "Müzik 2" },
        { "url": "müzik3.mp3", "title": "Müzik 3" }
    ];

    files.forEach((file) => {
        $("#songs").append(`
        <button song-data="${file.title}" class="btn color-white media-track" onclick="selectSong('${file.url}', this)">${file.title}</button>
        `);
    });

    $("#userName").on("change input", function () {
        const nameValue = $(this).val();
        if (nameValue.length > 0) {
            $("#confirmName").attr('disabled', false);
        } else {
            $("#confirmName").attr('disabled', true);
        }
    });

    $("#myModal").modal('show');
    $(".download-data").on("click", async function () {
        const userName = $("#userName").val();
        const songName = $("#selectedMusic").text();

        // 1. Prepare Data
        const timeLabels = [];
        const xValues = [];
        const yValues = [];

        const dataRows = currentCordinateTime.map(item => {
            const parts = item.data.split(' ');
            const xVal = parseFloat(parts[0].split(':')[1]);
            const yVal = parseFloat(parts[1].split(':')[1]);

            timeLabels.push(item.time);
            xValues.push(xVal);
            yValues.push(yVal);

            return [item.time, xVal, yVal];
        });

        // 2. Generate Chart Image
        const canvas = document.getElementById('chartCanvas');
        // Hack: Make it visible/sized temporarily if needed differently, but Chart.js works on hidden canvas usually if size set.
        // Better to clone or create new in memory, but this works.
        canvas.width = 800;
        canvas.height = 400;

        const ctx = canvas.getContext('2d');

        // Destroy previous chart instance if exists
        if (window.myChartInstance) {
            window.myChartInstance.destroy();
        }

        /* 
           Using a Promise to wait for the chart to render 
        */
        window.myChartInstance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Duygu Durumu',
                        data: xValues.map((x, i) => ({ x: x, y: yValues[i] })), // Combine X and Y
                        backgroundColor: 'rgba(255, 165, 0, 1)', // Orange dots
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                animation: false,
                responsive: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Duygu Koordinat Düzlemi'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'center', // Axis crosses at center
                        min: -5,
                        max: 5,
                        grid: {
                            color: (context) => context.tick.value === 0 ? '#000000' : '#e0e0e0', // Bold axis line
                            lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                        },
                        title: {
                            display: true,
                            text: 'Stres --- Heyecan'
                        }
                    },
                    y: {
                        type: 'linear',
                        position: 'center', // Axis crosses at center
                        min: -5,
                        max: 5,
                        grid: {
                            color: (context) => context.tick.value === 0 ? '#000000' : '#e0e0e0', // Bold axis line
                            lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                        },
                        title: {
                            display: true,
                            text: 'Depresyon --- Yüksek Uyarılma'
                        }
                    }
                }
            }
        });

        // Get Image Base64
        const chartImageBase64 = canvas.toDataURL('image/png');

        // 3. Create Excel with ExcelJS
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Veriler');

        // Define Columns
        worksheet.columns = [
            { header: 'Zaman (dk:sn)', key: 'time', width: 15 },
            { header: 'X Koordinatı', key: 'x', width: 15 },
            { header: 'Y Koordinatı', key: 'y', width: 15 }
        ];

        // Add User Info at the top (Insert Rows at top)
        worksheet.insertRow(1, ["Kullanıcı Adı", userName]);
        worksheet.insertRow(2, ["Şarkı", songName]);
        worksheet.insertRow(3, [""]); // Empty row

        // The header row pushed down. 
        // Previously columns definition adds header at current row (which was 1).
        // ExcelJS handles columns differently. Let's reset headers manually at row 4.

        // Clear default headers if any, and set Row 4
        worksheet.getRow(4).values = ["Zaman (dk:sn)", "X Koordinatı", "Y Koordinatı"];

        // Add Data
        dataRows.forEach(row => {
            worksheet.addRow(row);
        });

        // 4. Style the Table
        // Header Style (Row 4)
        const headerRow = worksheet.getRow(4);
        headerRow.eachCell((cell) => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFA500' } // Orange
            };
            cell.font = {
                bold: true,
                color: { argb: 'FFFFFFFF' } // White
            };
            cell.alignment = { horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Data Style
        // Iterate from row 5
        const firstDataRow = 5;
        const lastDataRow = 5 + dataRows.length - 1;

        if (dataRows.length > 0) {
            for (let r = firstDataRow; r <= lastDataRow; r++) {
                const row = worksheet.getRow(r);
                row.eachCell((cell) => {
                    cell.alignment = { horizontal: 'center' };
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            }
        }

        // 5. Embed the Chart Image
        const imageId = workbook.addImage({
            base64: chartImageBase64,
            extension: 'png',
        });

        // Place image below the data
        const startRow = lastDataRow + 2;
        worksheet.addImage(imageId, {
            tl: { col: 0, row: startRow }, // Top Left
            ext: { width: 600, height: 300 }
        });

        // 6. Save File using FileSaver
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, "KullaniciVerisi_Grafikli.xlsx");
    });
});