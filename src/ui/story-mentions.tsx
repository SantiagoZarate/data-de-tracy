import Image from "next/image";

const photoCatalog = [
  {
    name: "Moscú",
    category: "Localidad",
    pattern: /\bmoscú(?!\p{L})/iu,
    path: "8/85/Saint_Basil%27s_Cathedral_and_the_Red_Square.jpg",
    credit: "U.S. Department of State · Dominio público",
  },
  {
    name: "Ilha Grande",
    category: "Localidad",
    pattern: /\bilha grande\b/iu,
    path: "c/ca/View_Ilha_Grande.JPG",
    credit: "Claus Bunks · Dominio público",
  },
  {
    name: "Tandil",
    category: "Localidad",
    pattern: /\btandil\b/iu,
    path: "1/17/Tandil_desde_La_Movediza_2.JPG",
    credit: "Emmanuelmaggiori · CC BY-SA 3.0",
  },
  {
    name: "Alfajores",
    category: "Comida",
    pattern: /\balfajor(?:es)?\b/iu,
    path: "0/0c/AlfajoresP1115215_02.jpg",
    credit: "Alex Lozupone · CC BY 4.0",
  },
  {
    name: "Pasta de dientes",
    category: "Objeto",
    pattern: /\bpasta de dientes\b/iu,
    path: "4/49/Toothpasteonbrush.jpg",
    credit: "Thegreenj · CC BY-SA 3.0",
  },
];

export function StoryMentions({ title, summary }: { title: string; summary: string }) {
  const storyText = `${title} ${summary}`;
  const mentions = photoCatalog.filter(({ pattern }) => pattern.test(storyText));

  return (
    <section className="space-y-4">
      <h2 className="section-title">En esta Historia</h2>
      {mentions.length === 0 ? (
        <p className="metadata">Todavía no hay menciones con foto.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {mentions.map(({ name, category, path, credit }) => {
            const fileName = path.split("/").at(-1);
            return (
              <li key={name} className="surface overflow-hidden">
                <Image
                  src={`https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/250px-${fileName}`}
                  width={250}
                  height={168}
                  alt=""
                  unoptimized
                  className="aspect-[3/2] w-full bg-muted object-cover"
                />
                <div className="space-y-1 p-3">
                  <p className="font-medium">{name}</p>
                  <p className="metadata text-xs">{category}</p>
                  <a
                    href={`https://commons.wikimedia.org/wiki/File:${fileName}`}
                    className="text-link text-xs"
                  >
                    Foto: {credit}
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
