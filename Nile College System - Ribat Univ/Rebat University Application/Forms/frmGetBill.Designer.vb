<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmGetBill
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()> _
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()> _
    Private Sub InitializeComponent()
        Me.components = New System.ComponentModel.Container
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmGetBill))
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.Button5 = New System.Windows.Forms.Button
        Me.txtBatch = New System.Windows.Forms.TextBox
        Me.txtStudName = New System.Windows.Forms.TextBox
        Me.txtCollege = New System.Windows.Forms.TextBox
        Me.Label2 = New System.Windows.Forms.Label
        Me.Label13 = New System.Windows.Forms.Label
        Me.txtStudID = New System.Windows.Forms.TextBox
        Me.Label14 = New System.Windows.Forms.Label
        Me.Label1 = New System.Windows.Forms.Label
        Me.GroupBox99 = New System.Windows.Forms.GroupBox
        Me.Label10 = New System.Windows.Forms.Label
        Me.txtStampFees = New System.Windows.Forms.TextBox
        Me.txtMedExam = New System.Windows.Forms.TextBox
        Me.Label20 = New System.Windows.Forms.Label
        Me.txtUnivFormFees = New System.Windows.Forms.TextBox
        Me.Label18 = New System.Windows.Forms.Label
        Me.txtHighFormFees = New System.Windows.Forms.TextBox
        Me.Label17 = New System.Windows.Forms.Label
        Me.txtUniformFees = New System.Windows.Forms.TextBox
        Me.Label12 = New System.Windows.Forms.Label
        Me.txtInsurFees = New System.Windows.Forms.TextBox
        Me.Label11 = New System.Windows.Forms.Label
        Me.txtAmountTotalWr = New System.Windows.Forms.TextBox
        Me.Label15 = New System.Windows.Forms.Label
        Me.txtAmountTotal = New System.Windows.Forms.TextBox
        Me.Label16 = New System.Windows.Forms.Label
        Me.txtRegFees = New System.Windows.Forms.TextBox
        Me.Label9 = New System.Windows.Forms.Label
        Me.txtTusionFees = New System.Windows.Forms.TextBox
        Me.Label5 = New System.Windows.Forms.Label
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.txtSemester = New System.Windows.Forms.TextBox
        Me.txtAcdYear = New System.Windows.Forms.TextBox
        Me.Label7 = New System.Windows.Forms.Label
        Me.Label3 = New System.Windows.Forms.Label
        Me.Button2 = New System.Windows.Forms.Button
        Me.Button1 = New System.Windows.Forms.Button
        Me.GroupBox4 = New System.Windows.Forms.GroupBox
        Me.GroupBox6 = New System.Windows.Forms.GroupBox
        Me.txtCheqNo = New System.Windows.Forms.TextBox
        Me.Label4 = New System.Windows.Forms.Label
        Me.CombBank = New System.Windows.Forms.ComboBox
        Me.Button3 = New System.Windows.Forms.Button
        Me.ErrProvider = New System.Windows.Forms.ErrorProvider(Me.components)
        Me.GroupBox7 = New System.Windows.Forms.GroupBox
        Me.Button4 = New System.Windows.Forms.Button
        Me.Label21 = New System.Windows.Forms.Label
        Me.CombCollecter = New System.Windows.Forms.ComboBox
        Me.Label8 = New System.Windows.Forms.Label
        Me.txtBillSNo = New System.Windows.Forms.TextBox
        Me.Label6 = New System.Windows.Forms.Label
        Me.DTBillDate = New System.Windows.Forms.DateTimePicker
        Me.GroupBox3 = New System.Windows.Forms.GroupBox
        Me.Label19 = New System.Windows.Forms.Label
        Me.txtReqNo = New System.Windows.Forms.TextBox
        Me.GroupBox1.SuspendLayout()
        Me.GroupBox99.SuspendLayout()
        Me.GroupBox2.SuspendLayout()
        Me.GroupBox6.SuspendLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.GroupBox7.SuspendLayout()
        Me.GroupBox3.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.Button5)
        Me.GroupBox1.Controls.Add(Me.txtBatch)
        Me.GroupBox1.Controls.Add(Me.txtStudName)
        Me.GroupBox1.Controls.Add(Me.txtCollege)
        Me.GroupBox1.Controls.Add(Me.Label2)
        Me.GroupBox1.Controls.Add(Me.Label13)
        Me.GroupBox1.Controls.Add(Me.txtStudID)
        Me.GroupBox1.Controls.Add(Me.Label14)
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Location = New System.Drawing.Point(7, 51)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(547, 71)
        Me.GroupBox1.TabIndex = 1
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "الطالب"
        '
        'Button5
        '
        Me.Button5.Location = New System.Drawing.Point(86, 43)
        Me.Button5.Name = "Button5"
        Me.Button5.Size = New System.Drawing.Size(92, 23)
        Me.Button5.TabIndex = 28
        Me.Button5.Text = "كشف حساب"
        Me.Button5.UseVisualStyleBackColor = True
        '
        'txtBatch
        '
        Me.txtBatch.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtBatch.Location = New System.Drawing.Point(184, 45)
        Me.txtBatch.Name = "txtBatch"
        Me.txtBatch.ReadOnly = True
        Me.txtBatch.Size = New System.Drawing.Size(103, 20)
        Me.txtBatch.TabIndex = 3
        Me.txtBatch.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtStudName
        '
        Me.txtStudName.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStudName.Location = New System.Drawing.Point(45, 16)
        Me.txtStudName.Name = "txtStudName"
        Me.txtStudName.ReadOnly = True
        Me.txtStudName.Size = New System.Drawing.Size(242, 20)
        Me.txtStudName.TabIndex = 1
        '
        'txtCollege
        '
        Me.txtCollege.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtCollege.Location = New System.Drawing.Point(350, 45)
        Me.txtCollege.Name = "txtCollege"
        Me.txtCollege.ReadOnly = True
        Me.txtCollege.Size = New System.Drawing.Size(139, 20)
        Me.txtCollege.TabIndex = 2
        Me.txtCollege.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(293, 48)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(43, 13)
        Me.Label2.TabIndex = 4
        Me.Label2.Text = "الدفعة :"
        '
        'Label13
        '
        Me.Label13.AutoSize = True
        Me.Label13.Location = New System.Drawing.Point(294, 18)
        Me.Label13.Name = "Label13"
        Me.Label13.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.Label13.Size = New System.Drawing.Size(43, 13)
        Me.Label13.TabIndex = 0
        Me.Label13.Text = "الإسم :"
        '
        'txtStudID
        '
        Me.txtStudID.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStudID.Location = New System.Drawing.Point(350, 16)
        Me.txtStudID.Name = "txtStudID"
        Me.txtStudID.ReadOnly = True
        Me.txtStudID.Size = New System.Drawing.Size(139, 20)
        Me.txtStudID.TabIndex = 0
        Me.txtStudID.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label14
        '
        Me.Label14.AutoSize = True
        Me.Label14.Location = New System.Drawing.Point(495, 18)
        Me.Label14.Name = "Label14"
        Me.Label14.Size = New System.Drawing.Size(38, 13)
        Me.Label14.TabIndex = 24
        Me.Label14.Text = "الرقم :"
        Me.Label14.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(495, 48)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(40, 13)
        Me.Label1.TabIndex = 2
        Me.Label1.Text = "الكلية :"
        '
        'GroupBox99
        '
        Me.GroupBox99.Controls.Add(Me.Label10)
        Me.GroupBox99.Controls.Add(Me.txtStampFees)
        Me.GroupBox99.Controls.Add(Me.txtMedExam)
        Me.GroupBox99.Controls.Add(Me.Label20)
        Me.GroupBox99.Controls.Add(Me.txtUnivFormFees)
        Me.GroupBox99.Controls.Add(Me.Label18)
        Me.GroupBox99.Controls.Add(Me.txtHighFormFees)
        Me.GroupBox99.Controls.Add(Me.Label17)
        Me.GroupBox99.Controls.Add(Me.txtUniformFees)
        Me.GroupBox99.Controls.Add(Me.Label12)
        Me.GroupBox99.Controls.Add(Me.txtInsurFees)
        Me.GroupBox99.Controls.Add(Me.Label11)
        Me.GroupBox99.Controls.Add(Me.txtAmountTotalWr)
        Me.GroupBox99.Controls.Add(Me.Label15)
        Me.GroupBox99.Controls.Add(Me.txtAmountTotal)
        Me.GroupBox99.Controls.Add(Me.Label16)
        Me.GroupBox99.Controls.Add(Me.txtRegFees)
        Me.GroupBox99.Controls.Add(Me.Label9)
        Me.GroupBox99.Controls.Add(Me.txtTusionFees)
        Me.GroupBox99.Controls.Add(Me.Label5)
        Me.GroupBox99.Location = New System.Drawing.Point(7, 174)
        Me.GroupBox99.Name = "GroupBox99"
        Me.GroupBox99.Size = New System.Drawing.Size(547, 151)
        Me.GroupBox99.TabIndex = 3
        Me.GroupBox99.TabStop = False
        Me.GroupBox99.Text = " مبلغ و قدره :"
        '
        'Label10
        '
        Me.Label10.AutoSize = True
        Me.Label10.Location = New System.Drawing.Point(110, 18)
        Me.Label10.Name = "Label10"
        Me.Label10.Size = New System.Drawing.Size(44, 13)
        Me.Label10.TabIndex = 41
        Me.Label10.Text = "الدمغة :"
        '
        'txtStampFees
        '
        Me.txtStampFees.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtStampFees.Location = New System.Drawing.Point(23, 14)
        Me.txtStampFees.Name = "txtStampFees"
        Me.txtStampFees.Size = New System.Drawing.Size(81, 20)
        Me.txtStampFees.TabIndex = 2
        Me.txtStampFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtMedExam
        '
        Me.txtMedExam.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtMedExam.Location = New System.Drawing.Point(169, 44)
        Me.txtMedExam.Name = "txtMedExam"
        Me.txtMedExam.Size = New System.Drawing.Size(81, 20)
        Me.txtMedExam.TabIndex = 4
        Me.txtMedExam.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label20
        '
        Me.Label20.AutoSize = True
        Me.Label20.Location = New System.Drawing.Point(256, 48)
        Me.Label20.Name = "Label20"
        Me.Label20.Size = New System.Drawing.Size(80, 13)
        Me.Label20.TabIndex = 39
        Me.Label20.Text = "الكشف الطبي :"
        '
        'txtUnivFormFees
        '
        Me.txtUnivFormFees.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtUnivFormFees.Location = New System.Drawing.Point(169, 74)
        Me.txtUnivFormFees.Name = "txtUnivFormFees"
        Me.txtUnivFormFees.Size = New System.Drawing.Size(81, 20)
        Me.txtUnivFormFees.TabIndex = 7
        Me.txtUnivFormFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label18
        '
        Me.Label18.AutoSize = True
        Me.Label18.Location = New System.Drawing.Point(256, 78)
        Me.Label18.Name = "Label18"
        Me.Label18.Size = New System.Drawing.Size(82, 13)
        Me.Label18.TabIndex = 35
        Me.Label18.Text = "إستمارة جامعة :"
        '
        'txtHighFormFees
        '
        Me.txtHighFormFees.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtHighFormFees.Location = New System.Drawing.Point(350, 74)
        Me.txtHighFormFees.Name = "txtHighFormFees"
        Me.txtHighFormFees.Size = New System.Drawing.Size(81, 20)
        Me.txtHighFormFees.TabIndex = 6
        Me.txtHighFormFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label17
        '
        Me.Label17.AutoSize = True
        Me.Label17.Location = New System.Drawing.Point(437, 78)
        Me.Label17.Name = "Label17"
        Me.Label17.Size = New System.Drawing.Size(106, 13)
        Me.Label17.TabIndex = 33
        Me.Label17.Text = "إستمارة تعليم عالي :"
        '
        'txtUniformFees
        '
        Me.txtUniformFees.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtUniformFees.Location = New System.Drawing.Point(23, 44)
        Me.txtUniformFees.Name = "txtUniformFees"
        Me.txtUniformFees.Size = New System.Drawing.Size(81, 20)
        Me.txtUniformFees.TabIndex = 5
        Me.txtUniformFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label12
        '
        Me.Label12.AutoSize = True
        Me.Label12.Location = New System.Drawing.Point(110, 48)
        Me.Label12.Name = "Label12"
        Me.Label12.Size = New System.Drawing.Size(35, 13)
        Me.Label12.TabIndex = 31
        Me.Label12.Text = "الزي :"
        '
        'txtInsurFees
        '
        Me.txtInsurFees.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtInsurFees.Location = New System.Drawing.Point(350, 44)
        Me.txtInsurFees.Name = "txtInsurFees"
        Me.txtInsurFees.Size = New System.Drawing.Size(81, 20)
        Me.txtInsurFees.TabIndex = 3
        Me.txtInsurFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label11
        '
        Me.Label11.AutoSize = True
        Me.Label11.Location = New System.Drawing.Point(437, 48)
        Me.Label11.Name = "Label11"
        Me.Label11.Size = New System.Drawing.Size(45, 13)
        Me.Label11.TabIndex = 29
        Me.Label11.Text = "التأمين :"
        '
        'txtAmountTotalWr
        '
        Me.txtAmountTotalWr.BackColor = System.Drawing.Color.Black
        Me.txtAmountTotalWr.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAmountTotalWr.ForeColor = System.Drawing.Color.LawnGreen
        Me.txtAmountTotalWr.Location = New System.Drawing.Point(6, 104)
        Me.txtAmountTotalWr.Multiline = True
        Me.txtAmountTotalWr.Name = "txtAmountTotalWr"
        Me.txtAmountTotalWr.ReadOnly = True
        Me.txtAmountTotalWr.Size = New System.Drawing.Size(285, 39)
        Me.txtAmountTotalWr.TabIndex = 9
        '
        'Label15
        '
        Me.Label15.AutoSize = True
        Me.Label15.Location = New System.Drawing.Point(294, 108)
        Me.Label15.Name = "Label15"
        Me.Label15.Size = New System.Drawing.Size(50, 13)
        Me.Label15.TabIndex = 26
        Me.Label15.Text = "بالحروف :"
        Me.Label15.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtAmountTotal
        '
        Me.txtAmountTotal.BackColor = System.Drawing.Color.Black
        Me.txtAmountTotal.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAmountTotal.ForeColor = System.Drawing.Color.LawnGreen
        Me.txtAmountTotal.Location = New System.Drawing.Point(350, 104)
        Me.txtAmountTotal.Name = "txtAmountTotal"
        Me.txtAmountTotal.ReadOnly = True
        Me.txtAmountTotal.Size = New System.Drawing.Size(81, 20)
        Me.txtAmountTotal.TabIndex = 8
        Me.txtAmountTotal.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label16
        '
        Me.Label16.AutoSize = True
        Me.Label16.Location = New System.Drawing.Point(437, 107)
        Me.Label16.Name = "Label16"
        Me.Label16.Size = New System.Drawing.Size(53, 13)
        Me.Label16.TabIndex = 25
        Me.Label16.Text = "المجموع :"
        Me.Label16.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtRegFees
        '
        Me.txtRegFees.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtRegFees.Location = New System.Drawing.Point(169, 14)
        Me.txtRegFees.Name = "txtRegFees"
        Me.txtRegFees.Size = New System.Drawing.Size(81, 20)
        Me.txtRegFees.TabIndex = 1
        Me.txtRegFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label9
        '
        Me.Label9.AutoSize = True
        Me.Label9.Location = New System.Drawing.Point(256, 18)
        Me.Label9.Name = "Label9"
        Me.Label9.Size = New System.Drawing.Size(85, 13)
        Me.Label9.TabIndex = 17
        Me.Label9.Text = "رسوم التسجيل :"
        Me.Label9.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtTusionFees
        '
        Me.txtTusionFees.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtTusionFees.Location = New System.Drawing.Point(350, 14)
        Me.txtTusionFees.Name = "txtTusionFees"
        Me.txtTusionFees.Size = New System.Drawing.Size(81, 20)
        Me.txtTusionFees.TabIndex = 0
        Me.txtTusionFees.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Location = New System.Drawing.Point(437, 18)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(91, 13)
        Me.Label5.TabIndex = 12
        Me.Label5.Text = "الرسوم الدراسية :"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'GroupBox2
        '
        Me.GroupBox2.Controls.Add(Me.txtSemester)
        Me.GroupBox2.Controls.Add(Me.txtAcdYear)
        Me.GroupBox2.Controls.Add(Me.Label7)
        Me.GroupBox2.Controls.Add(Me.Label3)
        Me.GroupBox2.Location = New System.Drawing.Point(7, 125)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(547, 46)
        Me.GroupBox2.TabIndex = 2
        Me.GroupBox2.TabStop = False
        Me.GroupBox2.Text = "البيانات"
        '
        'txtSemester
        '
        Me.txtSemester.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtSemester.Location = New System.Drawing.Point(45, 15)
        Me.txtSemester.Name = "txtSemester"
        Me.txtSemester.ReadOnly = True
        Me.txtSemester.Size = New System.Drawing.Size(152, 20)
        Me.txtSemester.TabIndex = 16
        Me.txtSemester.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'txtAcdYear
        '
        Me.txtAcdYear.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtAcdYear.Location = New System.Drawing.Point(349, 15)
        Me.txtAcdYear.Name = "txtAcdYear"
        Me.txtAcdYear.ReadOnly = True
        Me.txtAcdYear.Size = New System.Drawing.Size(108, 20)
        Me.txtAcdYear.TabIndex = 15
        Me.txtAcdYear.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label7
        '
        Me.Label7.AutoSize = True
        Me.Label7.Location = New System.Drawing.Point(463, 18)
        Me.Label7.Name = "Label7"
        Me.Label7.Size = New System.Drawing.Size(80, 13)
        Me.Label7.TabIndex = 14
        Me.Label7.Text = "العام الدراسي :"
        Me.Label7.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(203, 18)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(87, 13)
        Me.Label3.TabIndex = 6
        Me.Label3.Text = "الفصل الدراسي :"
        '
        'Button2
        '
        Me.Button2.Location = New System.Drawing.Point(389, 462)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 31)
        Me.Button2.TabIndex = 6
        Me.Button2.Text = "حفظ"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'Button1
        '
        Me.Button1.Location = New System.Drawing.Point(97, 462)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 31)
        Me.Button1.TabIndex = 8
        Me.Button1.Text = "خروج"
        Me.Button1.UseVisualStyleBackColor = True
        '
        'GroupBox4
        '
        Me.GroupBox4.Location = New System.Drawing.Point(7, 448)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(547, 8)
        Me.GroupBox4.TabIndex = 18
        Me.GroupBox4.TabStop = False
        '
        'GroupBox6
        '
        Me.GroupBox6.Controls.Add(Me.txtCheqNo)
        Me.GroupBox6.Controls.Add(Me.Label4)
        Me.GroupBox6.Controls.Add(Me.CombBank)
        Me.GroupBox6.Location = New System.Drawing.Point(7, 398)
        Me.GroupBox6.Name = "GroupBox6"
        Me.GroupBox6.Size = New System.Drawing.Size(547, 47)
        Me.GroupBox6.TabIndex = 5
        Me.GroupBox6.TabStop = False
        Me.GroupBox6.Text = "طريقة الدفع"
        '
        'txtCheqNo
        '
        Me.txtCheqNo.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtCheqNo.Location = New System.Drawing.Point(8, 17)
        Me.txtCheqNo.Name = "txtCheqNo"
        Me.txtCheqNo.Size = New System.Drawing.Size(120, 20)
        Me.txtCheqNo.TabIndex = 1
        Me.txtCheqNo.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label4
        '
        Me.Label4.AutoSize = True
        Me.Label4.Location = New System.Drawing.Point(134, 20)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(108, 13)
        Me.Label4.TabIndex = 14
        Me.Label4.Text = "رقم الشيك / التوريدة :"
        Me.Label4.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'CombBank
        '
        Me.CombBank.AutoCompleteCustomSource.AddRange(New String() {"الخزينة"})
        Me.CombBank.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombBank.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombBank.FormattingEnabled = True
        Me.CombBank.Items.AddRange(New Object() {"كلية الطب", "كلية الصيدلة", "كلية علوم الحاسوب", "كلية القانون", "كلية الفنون"})
        Me.CombBank.Location = New System.Drawing.Point(262, 17)
        Me.CombBank.Name = "CombBank"
        Me.CombBank.Size = New System.Drawing.Size(271, 21)
        Me.CombBank.TabIndex = 0
        '
        'Button3
        '
        Me.Button3.Location = New System.Drawing.Point(243, 462)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(75, 31)
        Me.Button3.TabIndex = 7
        Me.Button3.Text = "مسح"
        Me.Button3.UseVisualStyleBackColor = True
        '
        'ErrProvider
        '
        Me.ErrProvider.ContainerControl = Me
        '
        'GroupBox7
        '
        Me.GroupBox7.Controls.Add(Me.Button4)
        Me.GroupBox7.Controls.Add(Me.Label21)
        Me.GroupBox7.Controls.Add(Me.CombCollecter)
        Me.GroupBox7.Controls.Add(Me.Label8)
        Me.GroupBox7.Controls.Add(Me.txtBillSNo)
        Me.GroupBox7.Location = New System.Drawing.Point(7, 328)
        Me.GroupBox7.Name = "GroupBox7"
        Me.GroupBox7.Size = New System.Drawing.Size(547, 67)
        Me.GroupBox7.TabIndex = 4
        Me.GroupBox7.TabStop = False
        Me.GroupBox7.Text = " الإيصال"
        '
        'Button4
        '
        Me.Button4.Location = New System.Drawing.Point(221, 36)
        Me.Button4.Name = "Button4"
        Me.Button4.Size = New System.Drawing.Size(35, 23)
        Me.Button4.TabIndex = 6
        Me.Button4.Text = "+"
        Me.Button4.UseVisualStyleBackColor = True
        '
        'Label21
        '
        Me.Label21.AutoSize = True
        Me.Label21.Location = New System.Drawing.Point(481, 41)
        Me.Label21.Name = "Label21"
        Me.Label21.Size = New System.Drawing.Size(55, 13)
        Me.Label21.TabIndex = 5
        Me.Label21.Text = "المتحصل :"
        '
        'CombCollecter
        '
        Me.CombCollecter.AutoCompleteCustomSource.AddRange(New String() {"الخزينة"})
        Me.CombCollecter.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombCollecter.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombCollecter.FormattingEnabled = True
        Me.CombCollecter.Location = New System.Drawing.Point(262, 38)
        Me.CombCollecter.Name = "CombCollecter"
        Me.CombCollecter.Size = New System.Drawing.Size(213, 21)
        Me.CombCollecter.TabIndex = 4
        '
        'Label8
        '
        Me.Label8.AutoSize = True
        Me.Label8.Location = New System.Drawing.Point(481, 16)
        Me.Label8.Name = "Label8"
        Me.Label8.Size = New System.Drawing.Size(38, 13)
        Me.Label8.TabIndex = 3
        Me.Label8.Text = "الرقم :"
        '
        'txtBillSNo
        '
        Me.txtBillSNo.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtBillSNo.Location = New System.Drawing.Point(398, 13)
        Me.txtBillSNo.Name = "txtBillSNo"
        Me.txtBillSNo.Size = New System.Drawing.Size(77, 20)
        Me.txtBillSNo.TabIndex = 0
        Me.txtBillSNo.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label6
        '
        Me.Label6.AutoSize = True
        Me.Label6.Location = New System.Drawing.Point(262, 18)
        Me.Label6.Name = "Label6"
        Me.Label6.Size = New System.Drawing.Size(42, 13)
        Me.Label6.TabIndex = 2
        Me.Label6.Text = "التاريخ :"
        '
        'DTBillDate
        '
        Me.DTBillDate.Location = New System.Drawing.Point(56, 14)
        Me.DTBillDate.Name = "DTBillDate"
        Me.DTBillDate.Size = New System.Drawing.Size(200, 20)
        Me.DTBillDate.TabIndex = 1
        '
        'GroupBox3
        '
        Me.GroupBox3.Controls.Add(Me.Label19)
        Me.GroupBox3.Controls.Add(Me.txtReqNo)
        Me.GroupBox3.Controls.Add(Me.DTBillDate)
        Me.GroupBox3.Controls.Add(Me.Label6)
        Me.GroupBox3.Location = New System.Drawing.Point(7, 3)
        Me.GroupBox3.Name = "GroupBox3"
        Me.GroupBox3.Size = New System.Drawing.Size(547, 45)
        Me.GroupBox3.TabIndex = 0
        Me.GroupBox3.TabStop = False
        Me.GroupBox3.Text = "إذن الدفع"
        '
        'Label19
        '
        Me.Label19.AutoSize = True
        Me.Label19.Location = New System.Drawing.Point(495, 17)
        Me.Label19.Name = "Label19"
        Me.Label19.Size = New System.Drawing.Size(31, 13)
        Me.Label19.TabIndex = 3
        Me.Label19.Text = "الرقم"
        '
        'txtReqNo
        '
        Me.txtReqNo.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtReqNo.Location = New System.Drawing.Point(350, 14)
        Me.txtReqNo.Name = "txtReqNo"
        Me.txtReqNo.Size = New System.Drawing.Size(139, 20)
        Me.txtReqNo.TabIndex = 0
        Me.txtReqNo.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'frmGetBill
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(553, 493)
        Me.Controls.Add(Me.GroupBox3)
        Me.Controls.Add(Me.GroupBox7)
        Me.Controls.Add(Me.Button3)
        Me.Controls.Add(Me.GroupBox6)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.GroupBox99)
        Me.Controls.Add(Me.GroupBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(569, 531)
        Me.MinimumSize = New System.Drawing.Size(569, 531)
        Me.Name = "frmGetBill"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "إصدار سند قبض رسوم دراسية"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.GroupBox99.ResumeLayout(False)
        Me.GroupBox99.PerformLayout()
        Me.GroupBox2.ResumeLayout(False)
        Me.GroupBox2.PerformLayout()
        Me.GroupBox6.ResumeLayout(False)
        Me.GroupBox6.PerformLayout()
        CType(Me.ErrProvider, System.ComponentModel.ISupportInitialize).EndInit()
        Me.GroupBox7.ResumeLayout(False)
        Me.GroupBox7.PerformLayout()
        Me.GroupBox3.ResumeLayout(False)
        Me.GroupBox3.PerformLayout()
        Me.ResumeLayout(False)

    End Sub
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents txtStudName As System.Windows.Forms.TextBox
    Friend WithEvents Label13 As System.Windows.Forms.Label
    Friend WithEvents txtStudID As System.Windows.Forms.TextBox
    Friend WithEvents Label14 As System.Windows.Forms.Label
    Friend WithEvents GroupBox99 As System.Windows.Forms.GroupBox
    Friend WithEvents txtTusionFees As System.Windows.Forms.TextBox
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents GroupBox6 As System.Windows.Forms.GroupBox
    Friend WithEvents CombBank As System.Windows.Forms.ComboBox
    Friend WithEvents Button3 As System.Windows.Forms.Button
    Friend WithEvents txtCheqNo As System.Windows.Forms.TextBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents ErrProvider As System.Windows.Forms.ErrorProvider
    Friend WithEvents GroupBox7 As System.Windows.Forms.GroupBox
    Friend WithEvents txtBillSNo As System.Windows.Forms.TextBox
    Friend WithEvents txtCollege As System.Windows.Forms.TextBox
    Friend WithEvents txtBatch As System.Windows.Forms.TextBox
    Friend WithEvents txtRegFees As System.Windows.Forms.TextBox
    Friend WithEvents Label9 As System.Windows.Forms.Label
    Friend WithEvents Label7 As System.Windows.Forms.Label
    Friend WithEvents txtAmountTotalWr As System.Windows.Forms.TextBox
    Friend WithEvents Label15 As System.Windows.Forms.Label
    Friend WithEvents txtAmountTotal As System.Windows.Forms.TextBox
    Friend WithEvents Label16 As System.Windows.Forms.Label
    Friend WithEvents Button5 As System.Windows.Forms.Button
    Friend WithEvents Label8 As System.Windows.Forms.Label
    Friend WithEvents Label6 As System.Windows.Forms.Label
    Friend WithEvents DTBillDate As System.Windows.Forms.DateTimePicker
    Friend WithEvents Label11 As System.Windows.Forms.Label
    Friend WithEvents txtUniformFees As System.Windows.Forms.TextBox
    Friend WithEvents Label12 As System.Windows.Forms.Label
    Friend WithEvents txtInsurFees As System.Windows.Forms.TextBox
    Friend WithEvents txtHighFormFees As System.Windows.Forms.TextBox
    Friend WithEvents Label17 As System.Windows.Forms.Label
    Friend WithEvents Label18 As System.Windows.Forms.Label
    Friend WithEvents txtUnivFormFees As System.Windows.Forms.TextBox
    Friend WithEvents GroupBox3 As System.Windows.Forms.GroupBox
    Friend WithEvents Label19 As System.Windows.Forms.Label
    Friend WithEvents txtReqNo As System.Windows.Forms.TextBox
    Friend WithEvents txtAcdYear As System.Windows.Forms.TextBox
    Friend WithEvents txtMedExam As System.Windows.Forms.TextBox
    Friend WithEvents Label20 As System.Windows.Forms.Label
    Friend WithEvents txtSemester As System.Windows.Forms.TextBox
    Friend WithEvents Label10 As System.Windows.Forms.Label
    Friend WithEvents txtStampFees As System.Windows.Forms.TextBox
    Friend WithEvents Label21 As System.Windows.Forms.Label
    Friend WithEvents CombCollecter As System.Windows.Forms.ComboBox
    Friend WithEvents Button4 As System.Windows.Forms.Button
End Class
