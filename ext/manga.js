document.body.style.border = "5px solid red";

$(document).ready(function () {
    $("body").css("background-color", "yellow");

    let __MANGA__ = null;

    $('script').each(function () {
        let text = $(this).text();
        if (!__MANGA__ && text && text.includes("window.__MANGA__")) {
            text = text.replace("window.__MANGA__", "__MANGA__");
            eval(text);
            console.log(JSON.stringify(__MANGA__, null, 4));
        }
    });

    if (__MANGA__) {
        handle_manga(__MANGA__);
    }
});

function group_by(xs, key) {
    return xs.reduce(function (rv, x) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
}

function handle_manga({id, name, slug}) {
    $('.comments-header').before(`<h3 style="padding: 10px;">Скачать тома:</h3>`);
    $('.comments-header').before(`<div id="manga-downloader" style="padding: 10px; border-bottom: 1px gray solid; display: flex; flex-wrap: wrap;"></div>`);

    const chapters = [];

    $(".chapter-item").each(function () {
        const el = $(this);
        const download = el.find('.chapter-item__icon_download');

        if (!download) {
            console.log(`error: chapter has no download element inside. may be login required`);
            return;
        }

        const chapter = {
            id: +el.attr('data-id'),
            volume: +el.attr('data-volume'),
            number: +el.attr('data-number'),
            download: +download.attr('data-download-chapter'),
            download_ref: download.attr('data-download-ref'),
        };
        chapters.push(chapter);
    });

    const gr = group_by(chapters, 'volume');
    for (const k of Object.keys(gr)) {
        const volume_chapters = gr[k];
        volume_chapters.sort((a, b) => a.number - b.number);
        const button = $(`<button>Том ${k}</button>`).click(download_manga_volume.bind(null, {
            manga_name: name,
            manga_slug: slug,
            volume_chapters
        }));
        $('#manga-downloader').append(button);
    }
}

function timeout(ms) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}

function download_url(manga_slug, chapter_slug, image_name) {
    return `https://img4.imgslib.ru/manga/${manga_slug}/chapters/${chapter_slug}/${image_name}`;
}

async function get_volume_info({manga_name, manga_slug, volume_chapters}) {
    const chapters = [];
    for (const {id, volume, number, download, download_ref} of volume_chapters) {
        console.log(`fetching https://mangalib.me/download/${id} ...`);
        const info_res = await fetch(`https://mangalib.me/download/${id}`);
        if (!info_res.ok) {
            throw new Error(`fetch result not ok`);
        }
        const info = await info_res.json();
        chapters.push({
            number,
            images: info.images.map(x => download_url(manga_slug, info.chapter.slug, x))
        });
        await timeout(300);
    }
    return {volume: volume_chapters[0].volume, chapters};
}

async function download_images({manga_name, volume, chapters}) {
    const convertBlobToBase64 = blob => new Promise((resolve, reject) => {
        const reader = new FileReader;
        reader.onerror = reject;
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.readAsDataURL(blob);
    });
    const fetchAsBlob = url => fetch(url)
        .then(response => {
            if (!response.ok) {
                return Promise.reject(response);
            }
            return response.blob();
        })
        .then(blob => convertBlobToBase64(blob));

    for (const chapter of chapters) {
        const {number, images} = chapter;
        const blobs = [];
        for (image of images) {
            const blob = await fetchAsBlob(image);
            blobs.push(blob);
        }
        console.log(`blobs: ${blobs.map(x => x.substr(0, 10)).join(',')}`);
    }
}

async function download_manga_volume_async({manga_name, manga_slug, volume_chapters}) {
    const {volume, chapters} = await get_volume_info({manga_name, manga_slug, volume_chapters});
    console.log({manga_name, volume, chapters});
    await download_images({manga_name, volume, chapters});
}

function download_manga_volume(obj) {
    download_manga_volume_async(obj)
        .then(() => console.log(`DOWNLOAD OK`))
        .catch(err => console.log('error downloading:', err));
}
