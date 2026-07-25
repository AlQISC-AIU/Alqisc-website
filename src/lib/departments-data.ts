export interface TeamMember {
  name: string;
  role: string;
  image: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
}

export interface Department {
  name: string;
  fullName: string;
  description: string;
  objectives: string[];
  responsibilities: string[];
  events: { title: string; description: string }[];
  teams: {
    title: string;
    members: TeamMember[];
  }[];
}

export const departments: Record<string, Department> = {
  exco: {
    name: "EXCO",
    fullName: "Executive Committee",
    description:
      "The Executive Committee (EXCO) serves as the leadership body of AL-QISC, responsible for the overall direction and management of the club. EXCO coordinates all departments and ensures smooth execution of club activities while upholding Islamic values and principles.",
    objectives: [
      "Provide strategic direction for the club",
      "Coordinate inter-departmental activities",
      "Represent the club to university administration",
      "Ensure adherence to Islamic principles in all activities",
    ],
    responsibilities: [
      "Planning annual programs and activities",
      "Managing club budget and resources",
      "Conducting regular committee meetings",
      "Liaising with university management",
      "Mentoring department heads",
    ],
    events: [
      {
        title: "Annual General Meeting",
        description: "Yearly meeting to review progress and elect new committee",
      },
      {
        title: "Leadership Workshop",
        description: "Training sessions for club members on Islamic leadership",
      },
    ],
    teams: [
      {
        title: "Top Management",
        members: [
          {
            name: "Mohammed Humed Hussien Mohammed",
            role: "President",
            image: "/images/president_alqisc.jpeg",
          },
          {
            name: "Abdiwahab Adam Osman",
            role: "Vice President 1",
            image: "/images/abdiwahab-removebg-preview (1).png",
          },
          {
            name: "Mansoor Hasan Ali Shokla",
            role: "Vice President 2",
            image: "/images/Mansour.jpeg",
          },
          {
            name: "Suhaila Binti Tajip",
            role: "Secretary 1",
            image: "/images/secretary1.jpg",
          },
          {
            name: "Ridwan Afolabi",
            role: "Secretary 2",
            image: "/images/RAM cap no bg.png",
          },
          {
            name: "Zikrullah Faizan",
            role: "Treasurer 1",
            image: "/images/Zikrullah.jpg",
          },
          {
            name: "Rahmatul Husna",
            role: "Treasurer 2",
            image: "/images/Rahmatul Husna.jpg",
          },
        ],
      },
    ],
  },
  education: {
    name: "Education",
    fullName: "Education Department",
    description:
      "The Education Department is dedicated to promoting Islamic knowledge and Quranic education among students. We organize classes, workshops, and educational programs to help students deepen their understanding of Islam and improve their Quran recitation.",
    objectives: [
      "Promote Quranic literacy and Tajweed knowledge",
      "Facilitate Arabic language learning",
      "Organize educational workshops and seminars",
      "Support students in their Islamic education journey",
    ],
    responsibilities: [
      "Conducting Quran and Tajweed classes",
      "Managing Arabic language courses",
      "Organizing Hafazan programs",
      "Coordinating Kids Islamic Academy",
      "Inviting guest lecturers and scholars",
    ],
    events: [
      {
        title: "Weekly Quran Circle",
        description: "Regular sessions for Quran reading and Tajweed practice",
      },
      {
        title: "Arabic Language Workshop",
        description: "Intensive workshops for learning Quranic Arabic",
      },
    ],
    teams: [
      {
        title: "Educational Development",
        members: [
          {
            name: "Reka Tatian",
            role: "Head of Education",
            image: "/images/p23.jpg",
          },
          {
            name: "Aria Firmansyah",
            role: "Deputy of Education",
            image: "/images/aria.jpg",
          },
          {
            name: "Sazally Manjang",
            role: "Exco Education",
            image: "/images/sazaly.jpg",
          },
          {
            name: "Thahida Mohd Noor",
            role: "Exco Education",
            image: "/images/p8.jpg",
          },
        ],
      },
    ],
  },
  "co-curricular": {
    name: "Co-Curricular",
    fullName: "Co-Curricular Department",
    description:
      "The Co-Curricular Department organizes a wide range of activities that complement academic learning with spiritual and social development. We focus on creating engaging programs that strengthen brotherhood and sisterhood while promoting Islamic values.",
    objectives: [
      "Organize diverse Islamic programs and activities",
      "Foster brotherhood and sisterhood among students",
      "Create platforms for spiritual growth",
      "Promote healthy Islamic lifestyle",
    ],
    responsibilities: [
      "Planning weekly and monthly talks",
      "Organizing Ramadan programs",
      "Coordinating community service activities",
      "Managing sports and recreational events",
    ],
    events: [
      { title: "Weekly Talk", description: "Weekly Islamic lectures featuring various speakers" },
      {
        title: "Monthly Talk",
        description: "Special monthly sessions with distinguished speakers",
      },
      { title: "Tahajud in Ramadan", description: "Late night prayers during the blessed month" },
    ],
    teams: [
      {
        title: "Co-Curricular Team",
        members: [
          {
            name: "Anshath Ahamed Ajumil",
            role: "Head of Co-Curricular",
            image: "/images/p-3.jpg",
          },
          {
            name: "Tigidankay Bah",
            role: "Deputy of Co-Curricular",
            image: "/images/Tigi.jpg",
          },
          {
            name: "Mohammed Mohammed Qaid Saleh Omairan",
            role: "Exco Co-Curricular",
            image: "/images/p7.jpg",
          },
        ],
      },
    ],
  },
  dawah: {
    name: "Da'wah",
    fullName: "Da'wah Department",
    description:
      "The Da'wah Department is dedicated to spreading the message of Islam through wisdom and beautiful preaching. We organize outreach programs, interfaith dialogues, and community awareness activities to share Islamic values with others.",
    objectives: [
      "Spread the message of Islam with wisdom",
      "Organize interfaith dialogue sessions",
      "Conduct community outreach programs",
      "Support new Muslims in their journey",
    ],
    responsibilities: [
      "Planning da'wah activities and programs",
      "Organizing Islamic awareness campaigns",
      "Coordinating with other religious organizations",
      "Providing support for new Muslims",
      "Distributing Islamic literature",
    ],
    events: [
      { title: "Islam Awareness Week", description: "Annual campaign to educate about Islam" },
      { title: "New Muslim Support Circle", description: "Support sessions for recent converts" },
    ],
    teams: [
      {
        title: "Da'wah Team",
        members: [
          {
            name: "Abdulsalam Aminu",
            role: "Head of Da'wah",
            image: "/images/abdousalam.jpg",
          },
          {
            name: "Ummusalma Othman Adam",
            role: "Deputy Da'wah",
            image: "/images/Umm Salamah.jpg",
          },
          {
            name: "Taslim Bashir",
            role: "Exco Da'wah",
            image: "/images/taslim.jpg",
          },
          {
            name: "Hasib Ur Rahman Omari",
            role: "Exco Da'wah",
            image: "/images/hashim.jpg",
          },
        ],
      },
    ],
  },
  media: {
    name: "Media",
    fullName: "Multimedia & Publication Department",
    description:
      "The Media Department handles all multimedia content, photography, videography, and publications for the club. We document club activities and create engaging visual content to promote Islamic values and club events.",
    objectives: [
      "Create high-quality multimedia content",
      "Document all club events and activities",
      "Design promotional materials and posters",
      "Manage club publications and newsletters",
    ],
    responsibilities: [
      "Photography and videography for events",
      "Creating posters and promotional materials",
      "Managing YouTube channel content",
      "Publishing newsletters and magazines",
      "Live streaming events",
    ],
    events: [
      { title: "Content Creation Workshop", description: "Training on creating Islamic content" },
      { title: "Photography Workshop", description: "Learning event documentation and Islamic art" },
    ],
    teams: [
      {
        title: "Multimedia & Publication Team",
        members: [
          {
            name: "Habiba S Abdulahi",
            role: "Head of Media & Publicist",
            image: "/images/head media.jpg",
          },
          {
            name: "Sanna Mustapha Cham",
            role: "Deputy Media & Publicist",
            image: "/images/sana.jpg",
          },
          {
            name: "OmarBasheer Ahmed Qasem Altabaei",
            role: "Exco Multimedia & Design",
            image: "/images/omer_bashar.jpeg",
          },
          {
            name: "Ibrahim Osman Sheikh Hussein",
            role: "Exco Multimedia & Design",
            image: "/images/ibrahim.jpg",
          },
          {
            name: "Mohamed Inshaf Mohamed Faleel",
            role: "Exco Multimedia & Design",
            image: "/images/p7.jpg",
          },
        ],
      },
    ],
  },
  ict: {
    name: "ICT",
    fullName: "ICT Department",
    description:
      "The ICT Department handles all technical infrastructure, website management, and digital systems for the club. We ensure AL-QISC's digital presence is maintained and provide technical support for all club activities.",
    objectives: [
      "Manage club website and digital platforms",
      "Provide technical support for events",
      "Develop digital solutions for club needs",
      "Maintain club's IT infrastructure",
    ],
    responsibilities: [
      "Website development and maintenance",
      "Managing social media accounts",
      "Technical setup for events",
      "Database and systems management",
      "IT support for club members",
    ],
    events: [
      { title: "Web Development Workshop", description: "Training on building websites" },
      { title: "Tech Talk Series", description: "Discussions on technology in Islamic context" },
    ],
    teams: [
      {
        title: "ICT Department",
        members: [
          {
            name: "Modou Lamin Kinteh",
            role: "Head of ICT",
            image: "/images/ict_head.jpg",
          },
          {
            name: "Mohamed Naseer Mohamed Afrath",
            role: "Deputy of ICT",
            image: "/images/ict_ass.jpg",
          },
        ],
      },
    ],
  },
  sister: {
    name: "Sister",
    fullName: "Sister Department",
    description:
      "The Sister Department is dedicated to supporting and empowering Muslim sisters at AIU. We organize programs specifically designed for sisters including Sister Circle, Islamic study groups, and sisterhood activities to strengthen the bond among Muslim women.",
    objectives: [
      "Empower Muslim sisters through knowledge",
      "Create a supportive sisterhood community",
      "Organize programs tailored for sisters",
      "Provide mentorship and guidance for sisters",
    ],
    responsibilities: [
      "Organizing Sister Circle sessions",
      "Planning sisters-only events and activities",
      "Coordinating Islamic study groups for sisters",
      "Providing mentorship programs",
      "Creating safe spaces for sisters to learn and grow",
    ],
    events: [
      { title: "Sister Circle", description: "Regular gatherings for sisters to discuss Islamic topics" },
      { title: "Sisters' Halaqah", description: "Islamic study circles for sisters" },
      { title: "Sisters' Retreat", description: "Annual retreat for spiritual rejuvenation" },
    ],
    teams: [
      {
        title: "Sister Department Team",
        members: [
          {
            name: "Ummusalma Othman Adam",
            role: "Head of Sister Dept",
            image: "/images/Umm Salamah.jpg",
          },
          {
            name: "Suhaila Binti Tajip",
            role: "Deputy Sister Dept",
            image: "/images/secretary1.jpg",
          },
          {
            name: "Rahmatul Husna",
            role: "Exco Sister Dept",
            image: "/images/Rahmatul Husna.jpg",
          },
          {
            name: "Thahida Mohd Noor",
            role: "Exco Sister Dept",
            image: "/images/p8.jpg",
          },
        ],
      },
    ],
  },
};

export const departmentOrder = [
  "exco",
  "education",
  "co-curricular",
  "dawah",
  "media",
  "ict",
  "sister",
];
