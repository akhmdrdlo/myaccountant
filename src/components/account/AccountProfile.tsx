import { MapPin, Briefcase, GraduationCap, Code, Award, ExternalLink, Github, Linkedin, Mail } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFinanceStore } from '../../store/useFinanceStore';

export const AccountProfile = () => {
    const { transactions, accounts } = useFinanceStore();

    // Mock stats
    const totalTransactions = transactions.length;
    const activeAccounts = accounts.length || 4;

    return (
        <div className="pb-24 pt-6 px-4">
            {/* Header / Profile Card */}
            <div className="bg-gradient-to-br from-brimo-primary to-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-200 mb-6 relative overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="relative mb-4 group">
                        <div className="w-24 h-24 rounded-full p-1 bg-white/20 backdrop-blur-sm">
                            <img
                                src="/pasfoto.png"
                                alt="Profile"
                                className="w-full h-full rounded-full object-cover border-2 border-white shadow-lg"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = "https://ui-avatars.com/api/?name=Akhmad+Ridlo&background=random";
                                }}
                            />
                        </div>
                        <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-blue-600" />
                    </div>

                    <h2 className="text-xl font-bold mb-1">Akhmad Ridlo Rifa'i</h2>
                    <p className="text-blue-100 text-sm font-medium bg-white/10 px-3 py-1 rounded-full backdrop-blur-md mb-2">
                        Software Engineer & Web Developer
                    </p>

                    <div className="flex items-center gap-2 text-xs text-blue-100 opacity-90 mb-6">
                        <MapPin className="w-3 h-3" />
                        <span>Bandung, Indonesia</span>
                    </div>

                    {/* Mini Stats */}
                    <div className="grid grid-cols-2 gap-4 w-full border-t border-white/20 pt-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold">{totalTransactions}</p>
                            <p className="text-[10px] text-blue-100 uppercase tracking-wider opacity-80">Transaksi</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold">{activeAccounts}</p>
                            <p className="text-[10px] text-blue-100 uppercase tracking-wider opacity-80">Akun Aktif</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* LinkedIn Style Content */}
            <div className="space-y-4">

                {/* About Section */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h3 className="text-md font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <span className="w-1 h-5 bg-brimo-secondary rounded-full"></span>
                        Tentang Saya
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed text-justify">
                        Mahasiswa Teknik Informatika di UIN Sunan Gunung Djati Bandung dengan passion di bidang Software Development, khususnya Web Development dan Software Quality Assurance. Berpengalaman menggunakan metodologi Agile dalam pengembangan sistem. Tertarik menjadi Software Engineer yang handal.
                    </p>
                </div>

                {/* Educations */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-5 bg-brimo-accent rounded-full"></span>
                        Pendidikan
                    </h3>
                    <div className="flex gap-4">
                        <div className="mt-1">
                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                <GraduationCap className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-800">UIN Sunan Gunung Djati Bandung</h4>
                            <p className="text-xs text-gray-600">Teknik Informatika (Informatics Engineering)</p>
                            <p className="text-[10px] text-gray-400 mt-1">Faculty of Science and Technology</p>
                        </div>
                    </div>
                </div>

                {/* Skills */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                        Keahlian & Minat
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {['Software Development', 'Web Development', 'Software Quality', 'Database Management', 'SQL', 'OOP', 'Leadership', 'Videographer'].map((skill) => (
                            <span key={skill} className="px-3 py-1.5 bg-gray-50 text-gray-600 text-[10px] font-medium rounded-full border border-gray-200">
                                {skill}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Certifications (Mock based on Google Play Academy) */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                    <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="w-1 h-5 bg-yellow-500 rounded-full"></span>
                        Sertifikasi
                    </h3>
                    <div className="flex gap-4 mb-4 items-start">
                        <div className="mt-1">
                            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600">
                                <Award className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-800">Associate Cloud Engineer Certificate</h4>
                            <p className="text-xs text-gray-600">Google Cloud</p>
                            <p className="text-[10px] text-gray-400 mt-1">Cloud Computing Fundamental on Google Cloud Console</p>
                        </div>
                    </div>
                    <div className="flex gap-4 mb-4 items-start">
                        <div className="mt-1">
                            <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center text-yellow-600">
                                <Award className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-800">Google Play Store Listing Certificate</h4>
                            <p className="text-xs text-gray-600">Google Play Academy</p>
                            <p className="text-[10px] text-gray-400 mt-1">App Growth Marketing Best Practices</p>
                        </div>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="flex justify-center gap-4 py-4 opacity-70">
                    <button className="p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-blue-600 transition-colors">
                        <a href="https://www.linkedin.com/in/akhmdrdlo/" target="_blank" rel="noopener noreferrer">
                            <Linkedin className="w-5 h-5" />
                        </a>
                    </button>
                    <button className="p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-gray-900 transition-colors">
                        <a href="https://github.com/akhmdrdlo" target="_blank" rel="noopener noreferrer">
                            <Github className="w-5 h-5" />
                        </a>
                    </button>
                    <button className="p-2 bg-white rounded-full shadow-sm text-gray-600 hover:text-red-500 transition-colors">
                        <a href="mailto:akhmadd432@gmail.com">
                            <Mail className="w-5 h-5" />
                        </a>
                    </button>
                </div>

            </div>
        </div>
    );
};
