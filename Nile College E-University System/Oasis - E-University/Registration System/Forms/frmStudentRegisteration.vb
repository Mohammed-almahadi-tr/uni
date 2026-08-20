Imports System.Data.SqlClient

Public Class frmStudentRegisteration
    Public dat As Date
    Public File2 As Integer
    Dim y As String

    Sub FillAcdYear()
        Try
            Me.Cursor = Cursors.WaitCursor

            Me.CombAcdYear.Items.Clear()
            Dim cmd As New SqlCommand("select  Distinct AcdYear From AcademicYear where AcdYear Is Not Null ", cnn)
            Dim rdr As SqlDataReader

            cnn.Open()
            rdr = cmd.ExecuteReader
            While rdr.Read
                Me.CombAcdYear.Items.Add(rdr.Item(0))
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Sub FillLevel()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select Distinct ProgramLevel From Programs where ProgramName=N'" & Me.txtProgram.Text & _
                                      "' and ProgramLevel Is Not Null", cnn)
            Dim Reader As SqlDataReader

            ' Me.combLevel.Items.Clear()

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                ' Me.combLevel.Items.Add(Reader.Item(0))
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub

    Sub FillStudDetails()
        Try
            Me.Cursor = Cursors.WaitCursor

            'Dim cmd As New SqlCommand("select StudentName,Program,Batch, " & _
            '                          "IsNull(dbo.GetProgramRegFees(Program,N'" & Me.txtBatch.Text & "'),0) RegFees from StudentsProfiles where StudentIndex=N'" & _
            '                          Me.txtStdIndex.Text & "'", cnn1)
            Dim cmd As New SqlCommand("select StudentName,Colleges,Program,Batch,TuitionFees1,RegTu,TypeAd,Type " & _
                                     " from StudentsProfilees where StudentIndex=N'" & _
                                     Me.txtStdIndex.Text & "'", cnn1)
            Dim Reader As SqlDataReader

            cnn1.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read

                Me.txtStdName.Text = Reader.Item("StudentName")
                Me.CombColleg.Text = Reader.Item("Colleges")
                Me.txtProgram.Text = Reader.Item("Program")
                Me.txtBatch.Text = Reader.Item("Batch")
                Me.txtTuitionFees.Text = Reader.Item("TuitionFees1")
                Me.txtRegFees.Text = Reader.Item("RegTu")

                Me.CombAcdYear.Text = "20" + Reader.Item("Batch")
                Me.TxtTYpeAD.Text = Reader.Item("TypeAd")
                Me.TxtType.Text = Reader.Item("Type")
                Me.CombLevel.Text = "الاول"
            End While
            cnn1.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub FillFees()
        Try
            Me.Cursor = Cursors.WaitCursor

            'Dim cmd As New SqlCommand("Select Program,TuitionFees1" & _
            '                         ",IsNull(dbo.GetProgramRegFees(Program,N'" & Me.txtBatch.Text & "'),0) RegFees From StudentsProfiles where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn)

            Dim cmd As New SqlCommand("Select TuitionFees1 From TuitionFees where Program=N'" & Me.txtProgram.Text & "' and Batch=N'" & Me.txtBatch.Text & "'", cnn)


            Dim reader As SqlDataReader

            cnn.Open()
            reader = cmd.ExecuteReader
            While reader.Read

                ' Me.txtTuitionFees.Text = CDbl(reader.Item("TuitionFees1")).ToString("N2")
                Me.txtRegFees.Text = CDbl(reader.Item("TuitionFees1")).ToString("N2")
                Me.txtDiscountPerc.Text = 0

            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub FillStudentRegisteration()
        Try
            Me.Cursor = Cursors.WaitCursor

            Me.ListView1.Items.Clear()

            'Dim cmd As New SqlCommand("Select SNo,Program,Semester,Class,AcademicYear,TuitionFees1,RegsFees,IsNull(DiscPerc,''),IsNull(DiscDescr,'') " & _
            '                          "From StudentsRegistration Where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn)
            Dim cmd As New SqlCommand("Select SNo,Specific,Batch,AcademicYear,TuitionFees1,Remain,IsNull(DiscPerc,''),IsNull(DiscDescr,'') " & _
                                     "From Registrations Where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                With Me.ListView1.Items.Add(Reader.Item(0))
                    .SubItems.Add(Reader.Item(1))
                    .SubItems.Add(Reader.Item(2))
                    .SubItems.Add("الاول")
                    .SubItems.Add(Reader.Item(3))
                    .SubItems.Add(CDbl(Reader.Item(4)).ToString("N2"))
                    .SubItems.Add(CDbl(Reader.Item(5)).ToString("N2"))
                    .SubItems.Add(Reader.Item(6))
                    .SubItems.Add(Reader.Item(7))
                End With
            End While
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Function ValidateRegisteration() As Boolean
        Try
            'Dim cmd As New SqlCommand("Select Count(*) From StudentsRegistration Where  " & _
            '                          "AcademicYear=N'" & Me.CombAcdYear.Text.Trim & "' And StudentIndex=N'" & Me.txtStdIndex.Text & "' And Semester=N'" & Me.CombSemester.SelectedItem & "'", cnn1)
            Dim cmd As New SqlCommand("Select Count(*) From Registrations Where " & _
                                      "AcademicYear=N'" & Me.CombAcdYear.Text.Trim & "' And StudentIndex=N'" & Me.txtStdIndex.Text & "' ", cnn1)

            Dim X As Boolean

            cnn1.Open()
            X = CBool(cmd.ExecuteScalar).ToString()
            cnn1.Close()

            If X = True Then
                MsgBox("الطالب مسجل لهذا الفصل الدراسي  في هذاالعام من قبل")
                Return True
            End If

            Return False
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Function

    Private Function ValidateRegFees()
        'If Me.CombSemester.SelectedIndex = 1 Then
        '    Me.txtRegFees.Text = "0.00"
        'ElseIf CombSemester.SelectedIndex = 0 Then
        '    FillFees()
        'End If
        'Try
        '    Me.Cursor = Cursors.WaitCursor


        '    Dim cmd As New SqlCommand("Select IsNull(Count(*),0) From StudentsRegistration Where " & _
        '                              " AcademicYear=N'" & Me.CombAcdYear.Text.Trim & "' And StudentIndex=N'" & Me.txtStdIndex.Text & "'" & _
        '                              " And Class=N'" & Me.combLevel.Text & "' And RegsFees=N'" & Me.txtRegFees.Text & "'", cnn1)
        '    Dim Y As Integer

        '    cnn1.Open()
        '    Y = CBool(cmd.ExecuteScalar.ToString)
        '    cnn1.Close()

        '    If Y = True Then
        '        Me.txtRegFees.Text = "0.00"
        '        Return True
        '    End If

        '    Return False
        'Catch ex As Exception
        '    Me.Cursor = Cursors.Default
        '    If cnn1.State = ConnectionState.Open Then
        '        cnn1.Close()
        '    End If
        '    MsgBox(ex.ToString)
        'End Try
    End Function

    Private Sub frmStudentRegisteration_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Me.WindowState = FormWindowState.Maximized
        ' FillAcdYear()
    End Sub

    Public Sub printFile(ByVal File2 As Integer)
        Try

            Dim dap As New SqlDataAdapter("select * from Registrations Where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn)

            Dim das As New DataSet1
            Dim dt As New DataTable
            dap.Fill(dt)
            ' dap.Fill(das, "Result")
            Dim rpt As New RegFil
            'rpt.SetDataSource(das.Tables("Result"))
            rpt.SetDataSource(dt)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()
        Catch ex As Exception
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
        'Try

        '    Dim dap As New SqlDataAdapter("select * from StudentsProfilees Where StudentIndex=N'" & Me.txtStdIndex.Text & "'", cnn)

        '    Dim das As New DataSet2
        '    Dim dt As New DataTable


        '    dap.Fill(das, "StudentsProfilees")


        '    Dim rpt As New StdFile
        '    rpt.SetDataSource(das)
        '    RptViewer.CrystalReportViewer2.ReportSource = rpt
        '    RptViewer.CrystalReportViewer2.RefreshReport()
        '    RptViewer.ShowDialog()
        'Catch ex As Exception
        '    If cnn1.State = ConnectionState.Open Then
        '        cnn1.Close()
        '    End If
        '    MsgBox(ex.ToString)

        'End Try
    End Sub
    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.ErrProvider.Clear()
        If Me.txtStdName.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtStdName, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtTuitionFees.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtTuitionFees, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.txtRegFees.Text.Trim.Length = 0 Then
            Me.ErrProvider.SetError(Me.txtRegFees, "الرجاء مراجعة البيانات")
            Exit Sub
        ElseIf Me.CombAcdYear.Text = "" Then
            Me.ErrProvider.SetError(Me.CombAcdYear, "الرجاء مراجعة البيانات")
            Exit Sub
        
        Else
            Try
                Me.Cursor = Cursors.WaitCursor

                If ValidateRegisteration() = True Then
                    Me.Cursor = Cursors.Default
                    Exit Sub
                End If


                Dim MoveNo As Integer
                Dim i As Integer
                Dim cmd As New SqlCommand
                Dim Trans As SqlTransaction
                Dim Descr As String = "تسجيل للعام الدراسي(" & Me.CombAcdYear.Text.Trim & ") البرنامج (" & Me.txtProgram.Text.Trim & ")"
                Dim Totalfees, Tutfees, Regfees As Double
                'If ChkBoPrem.Checked = True Then
                '    Tutfees = CDbl(Me.txtTuitionFeesafterdiscount.Text / 2).ToString
                '    Regfees = CDbl(Me.txtRegFees.Text)
                '    Totalfees = Tutfees + Regfees
                'Else
                '    Tutfees = CDbl(Me.txtTuitionFeesafterdiscount.Text).ToString
                '    Regfees = CDbl(Me.txtRegFees.Text)
                '    Totalfees = Tutfees + Regfees
                'End If
                cnn.Open()
                Trans = cnn.BeginTransaction
                cmd.Connection = cnn
                cmd.Transaction = Trans


                cmd.CommandText = "Select IsNull(Max(MoveNo),0) from Transactions Where Year(TransDate)=Year(GetDate())"
                MoveNo = CInt(cmd.ExecuteScalar) + 1

                'Adding a record in Registeration table
                'cmd.CommandText = "Insert Into StudentsRegistration (StudentIndex,StudentName,Program,AcademicYear,Batch,Class,Semester,TuitionFees1,RegsFees,DiscPerc,DiscDescr) " & _
                '                        "Values (@StudentIndex,@StudentName,@Program,@AcademicYear,@Batch,@Class,@Semester,@TuitionFees1,@RegsFees,@DiscPerc,@DiscDescr)"
                'cmd.Parameters.Clear()
                'cmd.Parameters.AddWithValue("@StudentIndex", Me.txtStdIndex.Text.Trim)
                'cmd.Parameters.AddWithValue("@StudentName", Me.txtStdName.Text.Trim)
                'cmd.Parameters.AddWithValue("@Program", Me.txtProgram.Text.Trim)
                'cmd.Parameters.AddWithValue("@AcademicYear", Me.CombAcdYear.Text.Trim)
                'cmd.Parameters.AddWithValue("@Batch", Me.txtBatch.Text.Trim)
                'cmd.Parameters.AddWithValue("@Class", Me.combLevel.Text.Trim)
                'cmd.Parameters.AddWithValue("@Semester", Me.CombSemester.Text.Trim)
                'cmd.Parameters.AddWithValue("@TuitionFees1", Tutfees)
                'cmd.Parameters.AddWithValue("@RegsFees", CDbl(Me.txtRegFees.Text.Trim))
                'cmd.Parameters.AddWithValue("@DiscPerc", Me.txtDiscountPerc.Text)
                'cmd.Parameters.AddWithValue("@DiscDescr", Me.txtDiscDescr.Text)
                'cmd.ExecuteNonQuery()
                cmd.CommandText = "Insert Into Registrations (StudentIndex,StudentName,AcademicYear,Colleges,Specific,Batch,TuitionFees1,Remain,DiscPerc,DiscDescr,Regfee,Name,Class,PaymentStatus) " & _
                                        "Values (@StudentIndex,@StudentName,@AcademicYear,@Colleges,@Specific,@Batch,@TuitionFees1,@Remain,@DiscPerc,@DiscDescr,@Regfee,@Name,@Class,@PaymentStatus)"
                cmd.Parameters.Clear()
                cmd.Parameters.AddWithValue("@StudentIndex", Me.txtStdIndex.Text.Trim)
                cmd.Parameters.AddWithValue("@StudentName", Me.txtStdName.Text.Trim)
                cmd.Parameters.AddWithValue("@Colleges", Me.CombColleg.Text.Trim)
                cmd.Parameters.AddWithValue("@Specific", Me.txtProgram.Text.Trim)
                cmd.Parameters.AddWithValue("@AcademicYear", Me.CombAcdYear.Text.Trim)
                cmd.Parameters.AddWithValue("@Batch", Me.txtBatch.Text.Trim)
                cmd.Parameters.AddWithValue("@Class", Me.CombLevel.Text.Trim)
                cmd.Parameters.AddWithValue("@Regfee", Me.txtRegFees.Text.Trim)
                'If Me.TxtTYpeAD.Text = "قبول خاص" Then
                '    cmd.Parameters.AddWithValue("@TuitionFees1", CDbl(Me.txtTuitionFeesafterdiscount.Text / 2))
                '    cmd.Parameters.AddWithValue("@Remain", CDbl(Me.txtTuitionFeesafterdiscount.Text / 2))
                'End If
               
                If Me.ChkBoPrem.Checked = True Then
                    cmd.Parameters.AddWithValue("@TuitionFees1", CDbl(Me.ttxtTuitionFeesafterdiscount.Text))
                    ' cmd.Parameters.AddWithValue("@Remain", CDbl(Me.txtTuitionFeesafterdiscount.Text / 2))
                    cmd.Parameters.AddWithValue("@Remain", CDbl(Me.TxtRem.Text))
                    'ElseIf Me.TxtTYpeAD.Text = "ابناء عاملين" Then

                    '    cmd.Parameters.AddWithValue("@TuitionFees1", CDbl(Me.txtTuitionFeesafterdiscount.Text / 4))
                    '    cmd.Parameters.AddWithValue("@Remain", 0)
                Else
                    cmd.Parameters.AddWithValue("@TuitionFees1", CDbl(Me.ttxtTuitionFeesafterdiscount.Text))
                    cmd.Parameters.AddWithValue("@Remain", 0)
                End If
                cmd.Parameters.AddWithValue("@DiscPerc", Me.txtDiscountPerc.Text)
                cmd.Parameters.AddWithValue("@DiscDescr", Me.txtDiscDescr.Text)
                cmd.Parameters.AddWithValue("@Name", CurrentUser)
                cmd.Parameters.AddWithValue("@PaymentStatus", 0)
                cmd.ExecuteNonQuery()

                '**************************** The debit/cridit will be inserted from financial system ****************

                ''Recording debit side for student
                'If CheckBox1.Checked = False Then
                '    ',N'Current Assets',N'Debtors',N'Students Fees',N'Students Fees',
                '    cmd.CommandText = "Insert Into Transactions (MoveNo,TransType,Descr,Acc1,Acc2,Acc3,Acc4,StudentID,StudentName,TotalOut,CostCenter,AccNo,SavedUser) " & _
                '                             "Values (@MoveNo,@TransType,@Descr,@Acc1,@Acc2,@Acc3,@Acc4,@StudentID,@StudentName,@TotalOut,@CostCenter,@AccNo,@SavedUser)"
                '    cmd.Parameters.Clear()
                '    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                '    cmd.Parameters.AddWithValue("@TransType", "قيد يومية")
                '    cmd.Parameters.AddWithValue("@Descr", Descr)
                '    cmd.Parameters.AddWithValue("@StudentID", Me.txtStdIndex.Text.Trim)
                '    cmd.Parameters.AddWithValue("@StudentName", Me.txtStdName.Text.Trim)
                '    cmd.Parameters.AddWithValue("@TotalOut", CDbl(Me.txtTuitionFees.Text))
                '    cmd.Parameters.AddWithValue("@CostCenter", "الرئاسة")
                '    cmd.Parameters.AddWithValue("@AccNo", Me.txtStdIndex.Text)
                '    cmd.Parameters.AddWithValue("@Acc1", "الاصول")
                '    cmd.Parameters.AddWithValue("@Acc2", "الاصول المتداولة")
                '    cmd.Parameters.AddWithValue("@Acc3", "(مدينون(الطلاب")
                '    cmd.Parameters.AddWithValue("@Acc4", Me.txtStdName.Text.Trim)
                '    cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)
                '    cmd.ExecuteNonQuery()
                '    'N'Current Assets',N'Debtors',N'Students Fees',N'Students Fees'
                '    cmd.CommandText = "Insert Into Transactions (MoveNo,TransType,Descr,Acc1,Acc2,Acc3,Acc4,StudentID,StudentName,TotalOut,CostCenter,AccNo,SavedUser) " & _
                '                             "Values (@MoveNo,@TransType,@Descr,@Acc1,@Acc2,@Acc3,@Acc4,@StudentID,@StudentName,@TotalOut,@CostCenter,@AccNo,@SavedUser)"
                '    cmd.Parameters.Clear()
                '    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                '    cmd.Parameters.AddWithValue("@TransType", "قيد يومية")
                '    cmd.Parameters.AddWithValue("@Descr", Descr)
                '    cmd.Parameters.AddWithValue("@StudentID", Me.txtStdIndex.Text.Trim)
                '    cmd.Parameters.AddWithValue("@StudentName", Me.txtStdName.Text.Trim)
                '    cmd.Parameters.AddWithValue("@TotalOut", CDbl(Me.txtRegFees.Text))
                '    cmd.Parameters.AddWithValue("@CostCenter", "الرئاسة")
                '    cmd.Parameters.AddWithValue("@AccNo", Me.txtStdIndex.Text)
                '    cmd.Parameters.AddWithValue("@Acc1", "الاصول")
                '    cmd.Parameters.AddWithValue("@Acc2", "الاصول المتداولة")
                '    cmd.Parameters.AddWithValue("@Acc3", "(مدينون(الطلاب")
                '    cmd.Parameters.AddWithValue("@Acc4", Me.txtStdName.Text.Trim)
                '    cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)
                '    cmd.ExecuteNonQuery()

                '    'Recording credit side for student(Tuition Fees)
                '    'N'Profit & Loss',N'Revenues',N'Students Fees'
                '    cmd.CommandText = "Insert Into Transactions (MoveNo,TransType,Descr,Acc1,Acc2,Acc3,Acc4,TotalIn,CostCenter,AccNo,SavedUser) " & _
                '                             "Values (@MoveNo,@TransType,@Descr,@Acc1,@Acc2,@Acc3,@Acc4,@TotalIn,@CostCenter,@AccNo,@SavedUser)"
                '    cmd.Parameters.Clear()
                '    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                '    cmd.Parameters.AddWithValue("@TransType", "قيد يومية")
                '    cmd.Parameters.AddWithValue("@Descr", Descr)
                '    'cmd.Parameters.AddWithValue("@AccNo", Me.txtStdIndex.Text)
                '    cmd.Parameters.AddWithValue("@Acc1", "الايرادات")
                '    cmd.Parameters.AddWithValue("@Acc2", "الايرادات الذاتية")
                '    cmd.Parameters.AddWithValue("@Acc3", "(ايرادات(الطلاب")
                '    ' cmd.Parameters.AddWithValue("@Acc4", "رسوم التسجيل")
                '    cmd.Parameters.AddWithValue("@Acc4", Me.txtProgram.Text.Trim)
                '    cmd.Parameters.AddWithValue("@TotalIn", Me.txtTuitionFees.Text)
                '    cmd.Parameters.AddWithValue("@CostCenter", "الرئاسة")
                '    cmd.Parameters.AddWithValue("@AccNo", Me.txtStdIndex.Text)
                '    cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)
                '    cmd.ExecuteNonQuery()


                '    ' 'Recording credit side for student(Registeration Fees)
                '    'N'Profit & Loss',N'Revenues',N'Students Registration Fees'
                '    cmd.CommandText = "Insert Into Transactions (MoveNo,TransType,Descr,Acc1,Acc2,Acc3,Acc4,TotalIn,CostCenter,AccNo,SavedUser) " & _
                '                             "Values (@MoveNo,@TransType,@Descr,@Acc1,@Acc2,@Acc3,@Acc4,@TotalIn,@CostCenter,@AccNo,@SavedUser)"
                '    cmd.Parameters.Clear()
                '    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                '    cmd.Parameters.AddWithValue("@TransType", "قيد يومية")
                '    cmd.Parameters.AddWithValue("@Descr", Descr)
                '    cmd.Parameters.AddWithValue("@Acc1", "الايرادات")
                '    cmd.Parameters.AddWithValue("@Acc2", "الايرادات الذاتية")
                '    cmd.Parameters.AddWithValue("@Acc3", "(ايرادات(الطلاب")
                '    cmd.Parameters.AddWithValue("@Acc4", Me.txtProgram.Text.Trim)
                '    cmd.Parameters.AddWithValue("@TotalIn", CDbl(Me.txtRegFees.Text))
                '    cmd.Parameters.AddWithValue("@CostCenter", "الرئاسة")
                '    cmd.Parameters.AddWithValue("@AccNo", Me.txtStdIndex.Text)
                '    cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)
                '    cmd.ExecuteNonQuery()

                'End If
                'Trans.Commit()
                'cnn.Close()

                'MsgBox("تم الحفظ")
                'Recording debit side for student
                If CheckBox1.Checked = False Then

                    cmd.CommandText = "Insert Into Transactionees (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,StudID,StudName,TotalValueOut,UserName) " & _
                                             "Values (@MoveNo,@Descr,N'Current Assets',N'Debtors',N'Students Fees',N'Students Fees',@StudID,@StudName,@TotalValueOut,@UserName)"
                    cmd.Parameters.Clear()
                    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                    cmd.Parameters.AddWithValue("@Descr", Descr)
                    cmd.Parameters.AddWithValue("@StudID", Me.txtStdIndex.Text.Trim)
                    cmd.Parameters.AddWithValue("@StudName", Me.txtStdName.Text.Trim)
                    cmd.Parameters.AddWithValue("@TotalValueOut", CDbl(Me.txtTuitionFees.Text))
                    cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                    cmd.ExecuteNonQuery()

                    cmd.CommandText = "Insert Into Transactionees (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,StudID,StudName,TotalValueOut,UserName) " & _
                                             "Values (@MoveNo,@Descr,N'Current Assets',N'Debtors',N'Students Fees',N'Students Fees',@StudID,@StudName,@TotalValueOut,@UserName)"
                    cmd.Parameters.Clear()
                    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                    cmd.Parameters.AddWithValue("@Descr", Descr)
                    cmd.Parameters.AddWithValue("@StudID", Me.txtStdIndex.Text.Trim)
                    cmd.Parameters.AddWithValue("@StudName", Me.txtStdName.Text.Trim)
                    cmd.Parameters.AddWithValue("@TotalValueOut", CDbl(Me.txtRegFees.Text))
                    cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                    cmd.ExecuteNonQuery()

                    'Recording credit side for student(Tuition Fees)
                    cmd.CommandText = "Insert Into Transactionees (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,TotalValueIn,UserName,StudID,StudName) " & _
                                             "Values (@MoveNo,@Descr,N'Profit & Loss',N'Revenues',N'Students Fees',@Acc4,@TotalValueIn,@UserName,@StudID,@StudName)"
                    cmd.Parameters.Clear()
                    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                    cmd.Parameters.AddWithValue("@Descr", Descr)
                    cmd.Parameters.AddWithValue("@Acc4", Me.txtProgram.Text.Trim)
                    cmd.Parameters.AddWithValue("@TotalValueIn", Me.txtTuitionFees.Text)
                    cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                    cmd.Parameters.AddWithValue("@StudID", Me.txtStdIndex.Text.Trim)
                    cmd.Parameters.AddWithValue("@StudName", Me.txtStdName.Text.Trim)
                    cmd.ExecuteNonQuery()


                    ' 'Recording credit side for student(Registeration Fees)
                    cmd.CommandText = "Insert Into Transactionees (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,TotalValueIn,UserName,StudID,StudName) " & _
                                             "Values (@MoveNo,@Descr,N'Profit & Loss',N'Revenues',N'Students Registration Fees',@Acc4,@TotalValueIn,@UserName,@StudID,@StudName)"
                    cmd.Parameters.Clear()
                    cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                    cmd.Parameters.AddWithValue("@Descr", Descr)
                    cmd.Parameters.AddWithValue("@Acc4", Me.txtProgram.Text.Trim)
                    cmd.Parameters.AddWithValue("@TotalValueIn", CDbl(Me.txtRegFees.Text))
                    cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                    cmd.Parameters.AddWithValue("@StudID", Me.txtStdIndex.Text.Trim)
                    cmd.Parameters.AddWithValue("@StudName", Me.txtStdName.Text.Trim)
                    cmd.ExecuteNonQuery()

                End If
                Trans.Commit()
                cnn.Close()

                MsgBox("تم الحفظ")
                printFile(File2)
                FillStudentRegisteration()

                'Clear
                Me.txtDiscountPerc.Value = 0.0
                Me.txtDiscDescr.Clear()
                'Me.txtTuitionFeesafterdiscount.Text = 0.0
                Me.CombAcdYear.SelectedIndex = -1
                'Me.combLevel.SelectedIndex = -1
                'Me.CombSemester.SelectedIndex = -1

                Me.Cursor = Cursors.Default
            Catch ex As Exception
                Me.Cursor = Cursors.Default
                If cnn.State = ConnectionState.Open Then
                    cnn.Close()
                End If
                MsgBox(ex.ToString)
            End Try
        End If

    End Sub

    Sub Clear()
        Me.txtRegFees.Clear()
        Me.txtTuitionFees.Clear()
        Me.txtDiscountPerc.Value = 0
        Me.CombAcdYear.SelectedIndex = -1
        Me.txtDiscDescr.Clear()
        Me.ttxtTuitionFeesafterdiscount.Clear()
        Me.txtStdName.Clear()
        Me.txtStdIndex.Clear()
        Me.txtProgram.Clear()
        Me.txtBatch.Clear()
        'Me.combLevel.SelectedIndex = -1
        'Me.CombSemester.SelectedIndex = -1
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        Clear()
    End Sub

    Private Sub txtStdIndex_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtStdIndex.KeyUp
        If e.KeyCode = Keys.Enter Then
            FillStudDetails()
            FillStudentRegisteration()
            'FillFees()

            ' Me.txtRegFees.Text = "120000"
        End If
    End Sub

    Private Sub txtStdIndex_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtStdIndex.TextChanged
        Me.txtStdName.Clear()
        Me.txtProgram.Clear()
        Me.txtBatch.Clear()
        Me.txtDiscountPerc.Value = 0
        Me.txtDiscDescr.Clear()
        Me.txtRegFees.Clear()
        Me.txtTuitionFees.Clear()
        Me.ttxtTuitionFeesafterdiscount.Clear()
        Me.CombAcdYear.SelectedIndex = -1
        Me.CombColleg.SelectedIndex = -1
        Me.ListView1.Items.Clear()
        Me.txtRegFees.Clear()
        Me.ChkBoPrem.Checked = False
        Me.CombLevel.SelectedIndex = -1
        '  Me.CombSemester.SelectedIndex = -1
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub


    Private Sub Button4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button4.Click
        SelStudID = ""

        Dim a As New frmSearchStdID
        a.ShowDialog()

        If SelStudID = "" Then
            Exit Sub
        End If
        Me.ChkBoPrem.Checked = False
        Me.ChkBoPrem.Enabled = True
        Me.txtStdIndex.Text = SelStudID
        Me.txtStdName.Text = SelStudName
        Me.txtProgram.Text = SelProgram

        FillStudDetails()
        'FillFees
        If Me.TxtTYpeAD.Text = "قبول خاص" Then
            Me.ChkBoPrem.Checked = True
            Me.ChkBoPrem.Enabled = False
        End If
        '  Me.txtRegFees.Text = "7000"

        FillStudentRegisteration()

    End Sub

    Private Sub Button5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button5.Click
        Try
            If Me.ListView1.SelectedItems.Count > 0 Then
                Me.Cursor = Cursors.WaitCursor

                Dim MoveNo As Integer
                Dim i As Integer
                Dim cmd As New SqlCommand
                Dim Trans As SqlTransaction
                Dim Descr As String = "إلغاء تسجيل طالب"
                Dim Totalfees, Tutfees, Regfees, Tutfees2 As Double

                'Calculate fees for program
                Tutfees = CDbl(Me.ListView1.SelectedItems.Item(0).SubItems(5).Text)
                Tutfees2 = CDbl(Me.ListView1.SelectedItems.Item(0).SubItems(6).Text)
                Regfees = CDbl(1030)
                Totalfees = Tutfees + Regfees + Tutfees2

                cnn.Open()
                Trans = cnn.BeginTransaction
                cmd.Connection = cnn
                cmd.Transaction = Trans

                cmd.CommandText = "Select IsNull(Max(MoveNo),0) from Transactionees Where Year(TransDate)=Year(GetDate())"
                MoveNo = CInt(cmd.ExecuteScalar) + 1

                'Delete the record for old program

                cmd.CommandText = "Delete from Registrations where SNo=" & Me.ListView1.SelectedItems.Item(0).Text
                cmd.ExecuteNonQuery()



                'Recording credit side for program
                cmd.CommandText = "Insert Into Transactionees (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,StudID,StudName,TotalValueIn,UserName) " & _
                                         "Values (@MoveNo,@Descr,N'Current Assets',N'Debtors',N'Students Fees',N'Students Fees',@StudID,@StudName,@TotalValueIn,@UserName)"
                cmd.Parameters.Clear()
                cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                cmd.Parameters.AddWithValue("@Descr", Descr)
                cmd.Parameters.AddWithValue("@StudID", Me.txtStdIndex.Text.Trim)
                cmd.Parameters.AddWithValue("@StudName", Me.txtStdName.Text.Trim)
                cmd.Parameters.AddWithValue("@TotalValueIn", Totalfees)
                cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                cmd.ExecuteNonQuery()

                'Recording debit side for student(Tuition Fees)
                cmd.CommandText = "Insert Into Transactionees (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,TotalValueOut,UserName,StudID,StudName) " & _
                                         "Values (@MoveNo,@Descr,N'Profit & Loss',N'Revenues',N'Students Fees',@Acc4,@TotalValueOut,@UserName,@StudID,@StudName)"
                cmd.Parameters.Clear()
                cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                cmd.Parameters.AddWithValue("@Descr", Descr)
                cmd.Parameters.AddWithValue("@Acc4", Me.ListView1.SelectedItems.Item(0).SubItems(1).Text)
                cmd.Parameters.AddWithValue("@TotalValueOut", Tutfees + Tutfees2)
                cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                cmd.Parameters.AddWithValue("@StudID", Me.txtStdIndex.Text.Trim)
                cmd.Parameters.AddWithValue("@StudName", Me.txtStdName.Text.Trim)
                cmd.ExecuteNonQuery()

                'Recording debit side for student(Registeration Fees)
                cmd.CommandText = "Insert Into Transactionees (MoveNo,Descr,Acc1,Acc2,Acc3,Acc4,TotalValueOut,UserName,StudID,@StudName) " & _
                                         "Values (@MoveNo,@Descr,N'Profit & Loss',N'Revenues',N'Students Fees',N'Registration Fees',@TotalValueOut,@UserName,@StudID,@StudName)"
                cmd.Parameters.Clear()
                cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
                cmd.Parameters.AddWithValue("@Descr", Descr)
                cmd.Parameters.AddWithValue("@TotalValueOut", Regfees)
                cmd.Parameters.AddWithValue("@UserName", CurrentUser)
                cmd.Parameters.AddWithValue("@StudID", Me.txtStdIndex.Text.Trim)
                cmd.Parameters.AddWithValue("@StudName", Me.txtStdName.Text.Trim)
                cmd.ExecuteNonQuery()

                Trans.Commit()
                cnn.Close()

                MsgBox("تم إلغاء عملية التسجيل")

                FillStudentRegisteration()

                Me.Cursor = Cursors.Default
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
        'Try
        '    If Me.ListView1.SelectedItems.Count > 0 Then
        '        Me.Cursor = Cursors.WaitCursor

        '        Dim MoveNo As Integer
        '        Dim i As Integer
        '        Dim cmd As New SqlCommand
        '        Dim Trans As SqlTransaction
        '        Dim Descr As String = "إلغاء تسجيل طالب"
        '        Dim Totalfees, Tutfees, Regfees, Tutfees2 As Double

        '        'Calculate fees for program
        '        Tutfees = CDbl(Me.ListView1.SelectedItems.Item(0).SubItems(5).Text)
        '        Tutfees2 = CDbl(Me.ListView1.SelectedItems.Item(0).SubItems(6).Text)
        '        Regfees = CDbl(txtRegFees.Text)
        '        Totalfees = Tutfees + Regfees + Tutfees2

        '        cnn.Open()
        '        Trans = cnn.BeginTransaction
        '        cmd.Connection = cnn
        '        cmd.Transaction = Trans

        '        cmd.CommandText = "Select IsNull(Max(MoveNo),0) from Transactions Where Year(TransDate)=Year(GetDate())"
        '        MoveNo = CInt(cmd.ExecuteScalar) + 1

        '        'Delete the record for old program

        '        cmd.CommandText = "Delete from Registrations where SNo=" & Me.ListView1.SelectedItems.Item(0).Text
        '        cmd.ExecuteNonQuery()



        '        'Recording credit side for program
        '        cmd.CommandText = "Insert Into Transactions (MoveNo,TransType,Descr,Acc1,Acc2,Acc3,Acc4,StudentID,StudentName,TotalIn,CostCenter,AccNo,SavedUser) " & _
        '                                 "Values (@MoveNo,@TransType,@Descr,N'Current Assets',N'Debtors',N'Students Fees',N'Students Fees',@StudentID,@StudentName,@TotalIn,@CostCenter,@AccNo,@SavedUser)"
        '        cmd.Parameters.Clear()
        '        cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
        '        cmd.Parameters.AddWithValue("@TransType", "قيد يومية")
        '        cmd.Parameters.AddWithValue("@Descr", Descr)
        '        cmd.Parameters.AddWithValue("@StudentID", Me.txtStdIndex.Text.Trim)
        '        cmd.Parameters.AddWithValue("@StudentName", Me.txtStdName.Text.Trim)
        '        cmd.Parameters.AddWithValue("@TotalIn", Totalfees)
        '        cmd.Parameters.AddWithValue("@CostCenter", "الرئاسة")
        '        cmd.Parameters.AddWithValue("@AccNo", Me.txtStdIndex.Text)
        '        cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)
        '        cmd.ExecuteNonQuery()

        '        'Recording debit side for student(Tuition Fees)
        '        cmd.CommandText = "Insert Into Transactions (MoveNo,TransType,Descr,Acc1,Acc2,Acc3,Acc4,TotalOut,CostCenter,AccNo,SavedUser) " & _
        '                                 "Values (@MoveNo,@TransType,@Descr,N'Profit & Loss',N'Revenues',N'Students Fees',@Acc4,@TotalOut,@CostCenter,@AccNo,@SavedUser)"
        '        cmd.Parameters.Clear()
        '        cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
        '        cmd.Parameters.AddWithValue("@TransType", "قيد يومية")
        '        cmd.Parameters.AddWithValue("@Descr", Descr)
        '        cmd.Parameters.AddWithValue("@Acc4", Me.ListView1.SelectedItems.Item(0).SubItems(1).Text)
        '        cmd.Parameters.AddWithValue("@TotalOut", Tutfees + Tutfees2)
        '        cmd.Parameters.AddWithValue("@CostCenter", "الرئاسة")
        '        cmd.Parameters.AddWithValue("@AccNo", Me.txtStdIndex.Text)
        '        cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)
        '        cmd.ExecuteNonQuery()

        '        'Recording debit side for student(Registeration Fees)
        '        cmd.CommandText = "Insert Into Transactions (MoveNo,TransType,Descr,Acc1,Acc2,Acc3,Acc4,TotalOut,CostCenter,AccNo,SavedUser) " & _
        '                                 "Values (@MoveNo,@TransType,@Descr,N'Profit & Loss',N'Revenues',N'Students Fees',N'Registration Fees',@TotalOut,@CostCenter,@AccNo,@SavedUser)"
        '        cmd.Parameters.Clear()
        '        cmd.Parameters.AddWithValue("@MoveNo", MoveNo)
        '        cmd.Parameters.AddWithValue("@TransType", "قيد يومية")
        '        cmd.Parameters.AddWithValue("@Descr", Descr)
        '        cmd.Parameters.AddWithValue("@TotalOut", Regfees)
        '        cmd.Parameters.AddWithValue("@CostCenter", "الرئاسة")
        '        cmd.Parameters.AddWithValue("@AccNo", Me.txtStdIndex.Text)
        '        cmd.Parameters.AddWithValue("@SavedUser", CurrentUser)
        '        cmd.ExecuteNonQuery()

        '        Trans.Commit()
        '        cnn.Close()

        '        MsgBox("تم إلغاء عملية التسجيل")

        '        FillStudentRegisteration()

        '        Me.Cursor = Cursors.Default
        '    End If
        'Catch ex As Exception
        '    Me.Cursor = Cursors.Default
        '    If cnn.State = ConnectionState.Open Then
        '        cnn.Close()
        '    End If
        '    MsgBox(ex.ToString)
        'End Try
    End Sub

    Private Sub btnAdd_Click_1(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Try
            Dim Str As String = InputBox("الرجاء إدخال رمز العام")

            If Trim(Str) = "" Then
                Exit Sub
            Else
                Me.Cursor = Cursors.WaitCursor
                Dim cmd As New SqlCommand("Insert Into AcademicYear (AcdYear,Batch) Values(N'" & Str & "',N'" & Me.txtBatch.Text & "')", cnn)
                cnn.Open()
                cmd.ExecuteNonQuery()
                cnn.Close()

                FillAcdYear()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try

    End Sub

    Private Sub NumericUpDown1_ValueChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtDiscountPerc.ValueChanged
        Calculate()
        y = Me.ttxtTuitionFeesafterdiscount.Text
    End Sub
    Sub Calculate()
        Try

            Dim Fees, Discount, NetFeesValue, Regfees As Double
            Fees = CDbl(Me.txtTuitionFees.Text)
            ' Regfees = CDbl(txtRegFees.Text)

            ' Totalfees = Fees + Regfees
            Discount = CDbl(Me.txtDiscountPerc.Value)
            NetFeesValue = Fees - (Discount * Fees / 100)

            Me.ttxtTuitionFeesafterdiscount.Text = NetFeesValue.ToString("N2")
            y = Me.ttxtTuitionFeesafterdiscount.Text
            Me.TxtRem.Text = CInt(y) - CInt(Me.ttxtTuitionFeesafterdiscount.Text)
            ' Me.TxtRem.Text = NetFeesValue.ToString("N2")
            ' Me.txtTuitionFees.Text = NetFeesValue.ToString("N2")

        Catch ex As Exception
            Me.txtDiscountPerc.Value = 0
            ' Me.txtTuitionFeesafterdiscount.Text = Me.txtTuitionFees.Text + regfee

            Me.ttxtTuitionFeesafterdiscount.Text = Me.txtTuitionFees.Text

        End Try


    End Sub
    Sub Calculate1()
        Try

            Dim Fees, Discount, NetFeesValue, Regfees As Double
            Fees = CDbl(Me.txtTuitionFees.Text)
            ' Regfees = CDbl(txtRegFees.Text)

            ' Totalfees = Fees + Regfees
            Discount = CDbl(Me.txtDiscountPerc.Value)
            NetFeesValue = Fees - (Discount * Fees / 100)

            Me.ttxtTuitionFeesafterdiscount.Text = NetFeesValue.ToString("N2")

        Catch ex As Exception
            Me.txtDiscountPerc.Value = 0
            ' Me.txtTuitionFeesafterdiscount.Text = Me.txtTuitionFees.Text + regfee

            Me.ttxtTuitionFeesafterdiscount.Text = Me.txtTuitionFees.Text

        End Try


    End Sub

    Private Sub txtTuitionFees_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtTuitionFees.TextChanged
        Calculate()
    End Sub

    Private Sub CombAcdYear_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles CombAcdYear.SelectedIndexChanged
        Err.Clear()
    End Sub

    Private Sub combLevel_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Err.Clear()
    End Sub

    Private Sub CombSemester_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Err.Clear()
        ValidateRegFees()
    End Sub

    Private Sub txtProgram_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtProgram.TextChanged
        'المستوي الدراسي
        'FillLevel()
    End Sub

    Private Sub ChkBoPrem_CheckedChanged(sender As System.Object, e As System.EventArgs) Handles ChkBoPrem.CheckedChanged
        Calculate()
        Dim x As String
        'x = Me.txtTuitionFees.Text
        y = Me.ttxtTuitionFeesafterdiscount.Text
        x = Me.ttxtTuitionFeesafterdiscount.Text
        If Me.ChkBoPrem.Checked = True Then
            'Me.txtTuitionFees.Text = x / 2
            Me.ttxtTuitionFeesafterdiscount.Text = x / 2
            Me.TxtRem.Text = x / 2
            '    ' Me.ChkBoPrem.Enabled = False
        Else
            ' Me.txtTuitionFeesafterdiscount.Text = (Me.txtTuitionFees.Text)
            Me.ttxtTuitionFeesafterdiscount.Text = x
        End If
    End Sub

    Private Sub CheckBox1_CheckedChanged(sender As System.Object, e As System.EventArgs) Handles CheckBox1.CheckedChanged
        Me.CombAcdYear.Enabled = True
        Me.CombLevel.Enabled = True
    End Sub

    Private Sub CheckBox2_CheckedChanged(sender As System.Object, e As System.EventArgs)
        'Calculate1()
        'Dim x As String
        'x = Me.txtTuitionFees.Text
        'If Me.CheckBox2.Checked = True Then
        '    Me.txtTuitionFees.Text = x / 3
        '    'Me.CheckBox2.Enabled = False
        'End If
    End Sub

    Private Sub ListView1_SelectedIndexChanged(sender As System.Object, e As System.EventArgs) Handles ListView1.SelectedIndexChanged

    End Sub

    Private Sub txtTuitionFeesafterdiscount_TextChanged(sender As System.Object, e As System.EventArgs) Handles ttxtTuitionFeesafterdiscount.TextChanged, ttxtTuitionFeesafterdiscount.TextChanged
        Dim a, z As String
        Try
            a = CInt(y) - CInt(Me.ttxtTuitionFeesafterdiscount.Text)
            z = a + 0
            Me.TxtRem.Text = z
        Catch ex As Exception
            
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button6_Click(sender As System.Object, e As System.EventArgs) Handles Button6.Click
        Try
            If Me.ListView1.SelectedItems.Count > 0 Then
                Me.Cursor = Cursors.WaitCursor

                Dim MoveNo As Integer
                Dim i As Integer
                Dim cmd As New SqlCommand
                Dim Trans As SqlTransaction
                Dim Descr As String = "إلغاء تسجيل طالب"
                Dim Totalfees, Tutfees, Regfees, Tutfees2 As Double

                'Calculate fees for program
                Tutfees = CDbl(Me.ListView1.SelectedItems.Item(0).SubItems(5).Text)
                Tutfees2 = CDbl(Me.ListView1.SelectedItems.Item(0).SubItems(6).Text)
                Regfees = CDbl(1030)
                Totalfees = Tutfees + Regfees + Tutfees2

                cnn.Open()
                Trans = cnn.BeginTransaction
                cmd.Connection = cnn
                cmd.Transaction = Trans

                'cmd.CommandText = "Select IsNull(Max(MoveNo),0) from Transactionees Where Year(TransDate)=Year(GetDate())"
                'MoveNo = CInt(cmd.ExecuteScalar) + 1

                'Delete the record for old program

                cmd.CommandText = "Delete from Registrations where SNo=" & Me.ListView1.SelectedItems.Item(0).Text
                cmd.ExecuteNonQuery()
                Trans.Commit()
                cnn.Close()

                MsgBox("تم إلغاء عملية التسجيل")

                FillStudentRegisteration()

                Me.Cursor = Cursors.Default
            End If
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
End Class