Imports System.Data.SqlClient
Imports EgyCurr.CurText

Public Class frmStudentProfiles
    Public dat As Date
    Public File As Integer
    Sub ValidateUniversityID()
        Try
            Dim cmd As New SqlCommand("Select Count(*) From StdForm Where " & _
                                      " UnivID=N'" & Me.txtStdIndex.Text & "' ", cnn1)
            Dim X As Boolean

            cnn1.Open()
            X = CBool(cmd.ExecuteScalar.ToString)
            cnn1.Close()

            If X = False Then
                MsgBox("لم يتم ادخال بيانات الطالب بعد", , "الادارة")

            End If


        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn1.State = ConnectionState.Open Then
                cnn1.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
    Sub Profile()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.GridStudProfiles.Rows.Clear()
            'Dim cmd As New SqlCommand("select UnivID,RegDate,JobofParent,StudentPhoneNo,Year,StdFiNaA,StdSNaA,StdThNaA,StdFoNaA,Program,ParentPhone from StdForm where StdFiNaA Like N'%" & Me.txtStudNameSearch.Text.Trim & "%' and Coleg='علوم التمريض' Order By RegDate ASC", cnn)
            'Dim reader As SqlDataReader
            'Dim cmd As New SqlCommand("select UnivID,RegDate,JobofParent,StudentPhoneNo,Year,StdFiNaA,StdSNaA,StdThNaA,StdFoNaA,Program,ParentPhone from StdForm where StdFiNaA Like N'%" & Me.txtStudNameSearch.Text.Trim & "%' and CH=0 and Coleg='الهندسة' or Coleg='العمارة'  Order By RegDate ASC", cnn)
            Dim cmd As New SqlCommand("select UnivID,RegDate,JobofParent,StudentPhoneNo,Year,StdFiNaA,StdSNaA,StdThNaA,StdFoNaA,Program,ParentPhone from StdForm where StdFiNaA Like N'%" & Me.txtStudNameSearch.Text.Trim & "%' and CH=0 and Coleg='علوم الحاسوب وتقانة المعلومات'   Order By RegDate ASC", cnn)
            '  and Coleg='الدراسـات التجـارية '
            Dim reader As SqlDataReader
            cnn.Open()

            reader = cmd.ExecuteReader
            Dim x, x1, x2, x3, x4 As String

            While reader.Read
                x1 = reader.Item("StdFiNaA")
                x2 = reader.Item("StdSNaA")
                x3 = reader.Item("StdThNaA")
                x4 = reader.Item("StdFoNaA")
                x = x1 + " " + x2 + " " + x3 + " " + x4
                'x01 = Me.TxtRe.Text
                Me.GridStudProfiles.Rows.Add(New String() {reader.Item("UnivID"), x, _
                                                           reader.Item("Program"), _
                                                           reader.Item("Year"), reader.Item("RegDate"), reader.Item("JobofParent"), reader.Item("ParentPhone"), _
                                                           reader.Item("StudentPhoneNo"), "تعديل", "حذف"})

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
    Sub FillStudentProfile()
        Try
            Me.Cursor = Cursors.WaitCursor

            Me.GridStudProfiles.Rows.Clear()
            'Dim cmd As New SqlCommand("Select SNo,StudentIndex,StudentName,Program,Batch, PhoneNo,Address,Nationality,TuitionFees1 " & _
            '                          "From StudentsProfilees Where StudentName Like N'%" & Me.txtStudNameSearch.Text.Trim & "%' and Colleges='علوم الحاسوب وتقانة المعلومات' ", cnn4)
            'Dim Reader As SqlDataReader
            Dim cmd As New SqlCommand("Select SNo,StudentIndex,StudentName,Program,Batch, PhoneNo,Address,Nationality,TuitionFees1 " & _
                                      "From StudentsProfilees Where StudentName Like N'%" & Me.txtStudNameSearch.Text.Trim & "%' ", cnn4)
            Dim Reader As SqlDataReader

            cnn4.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                Me.GridStudProfiles.Rows.Add(New String() {Reader.Item("SNo"), Reader.Item("StudentIndex"), _
                                                           Reader.Item("StudentName"), Reader.Item("Program"), _
                                                           Reader.Item("Batch"), Reader.Item("TuitionFees1"), Reader.Item("Nationality"), _
                                                           Reader.Item("PhoneNo"), Reader.Item("Address"), "تعديل", "حذف"})
            End While
            cnn4.Close()
            For Each Row As DataGridViewRow In GridStudProfiles.Rows
                For i As Integer = 0 To Me.GridStudProfiles.ColumnCount - 3
                    If Row.Cells(i).Value = " " Then
                        Row.DefaultCellStyle.BackColor = Color.Red
                        'Exit For
                    End If
                Next
            Next

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn4.State = ConnectionState.Open Then
                cnn4.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub FillNationality()
        Try
            Me.Cursor = Cursors.WaitCursor
            Me.combNationality.Items.Clear()
            Dim cmd As New SqlCommand("select Nationality From Nationalites where Nationality Is Not Null", cnn)
            Dim reader As SqlDataReader

            cnn.Open()
            reader = cmd.ExecuteReader
            While reader.Read
                Me.combNationality.Items.Add(reader.Item(0))
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
    Public Sub printFile(ByVal File As Integer)
        Try

            Dim dap As New SqlDataAdapter("select * from StudentsProfilees Where StudentIndex=N'" & (Me.TxtYear.Text) + Me.txtStdIndex.Text & "'", cnn)

            Dim das As New DataSet2
            Dim dt As New DataTable
            dap.Fill(dt)
            ' dap.Fill(das, "Result")
            Dim rpt As New StdFile
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
    'Sub FillProgram()
    '    Try
    '        Me.Cursor = Cursors.WaitCursor
    '        Me.TxtProgram.Clear()
    '        Dim cmd As New SqlCommand("select distinct ProgramName From Programs where ProgramName Is Not Null", cnn)
    '        Dim rdr As SqlDataReader

    '        cnn.Open()
    '        rdr = cmd.ExecuteReader
    '        While rdr.Read
    '            Me.TxtProgram.Items.Add(rdr.Item(0))
    '        End While
    '        cnn.Close()
    '        Me.Cursor = Cursors.Default
    '    Catch ex As Exception
    '        Me.Cursor = Cursors.Default
    '        If cnn.State = ConnectionState.Open Then
    '            cnn.Close()
    '        End If
    '        MsgBox(ex.Message)
    '    End Try
    'End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Me.ErrorProvider1.Clear()
        If Me.txtStdName.Text.Trim.Length = 0 Then
            Me.ErrorProvider1.SetError(Me.txtStdName, "الرجاء ادخال الاسم الاول الطالب")
            Exit Sub
        ElseIf Me.txtStdAdderess.Text.Trim.Length = 0 Then
            Me.ErrorProvider1.SetError(Me.txtStdAdderess, "الرجاء ادخال عنوان الطالب ")
            Exit Sub
        ElseIf Me.txtTutionFee.Text.Trim.Length = 0 Then
            Me.ErrorProvider1.SetError(Me.txtTutionFee, "الرجاء ادخال الرسوم الدراسية للطالب ")
            Exit Sub
        ElseIf Me.TxtRe.Text.Trim.Length = 0 Then
            Me.ErrorProvider1.SetError(Me.TxtRe, "الرجاء ادخال رسوم التسجيل للطالب ")
            Exit Sub
        ElseIf Me.TxtYear.Text.Trim.Length = 0 Then
            Me.ErrorProvider1.SetError(Me.TxtYear, "الرجاء ادخال الدفعة   ")

        ElseIf Me.ComboBox1.SelectedIndex = -1 Then
            Me.ErrorProvider1.SetError(Me.ComboBox1, "الرجاءتحديد نتيجة المعاينة   ")

        ElseIf Me.txtReasonofIndecent.Text.Trim.Length = 0 And Me.ComboBox1.Text = "لايقبل" Then
            Me.ErrorProvider1.SetError(Me.txtReasonofIndecent, "الرجاء ادخال  السبب الذي جعل الطالب غير مقبول ")
            Exit Sub

        Else
            Try
                Me.Cursor = Cursors.WaitCursor

                Dim cmd As New SqlCommand()

                cnn.Open()
                cmd.Connection = cnn
                If Me.ComboBox1.Text = "يقبل" Then
                    cmd.CommandText = "Delete From StudentsProfilees Where StudentIndex=N'" & (Me.TxtYear.Text) + (Me.txtStdIndex.Text.Trim) & "'"
                    cmd.ExecuteNonQuery()
                    cmd.CommandText = "Insert Into StudentsProfilees (StudentIndex,StudentName,Colleges,Program,TypeAd,Type,Batch,PhoneNo,Address,Nationality,TuitionFees1,RegTu,Written,Employee)" & _
                                                            "Values (@StudentIndex,@StudentName,@Colleges,@Program,@TypeAd,@Type,@Batch,@PhoneNo,@Address,@Nationality,@TuitionFees1,@RegTu,@Written,@Employee) Select SCOPE_IDENTITY()"

                    'Add values
                    'Dim id As Integer
                    'id = (Me.TxtYear.Text) + (Me.txtStdIndex.Text.Trim)
                    cmd.Parameters.AddWithValue("@StudentIndex", ((Me.TxtYear.Text) + (Me.txtStdIndex.Text.Trim)))
                    cmd.Parameters.AddWithValue("@StudentName", Me.txtStdName.Text.Trim)
                    cmd.Parameters.AddWithValue("@Colleges", Me.CombColleg.Text)
                    cmd.Parameters.AddWithValue("@Program", Me.TxtProgram.Text)
                    cmd.Parameters.AddWithValue("@Batch", Me.TxtYear.Text)
                    cmd.Parameters.AddWithValue("@PhoneNo", Me.txtStdParJop.Text.Trim)
                    cmd.Parameters.AddWithValue("@Address", Me.txtStdAdderess.Text.Trim)
                    cmd.Parameters.AddWithValue("@Nationality", Me.combNationality.Text)
                    cmd.Parameters.AddWithValue("@TuitionFees1", CDbl(Me.txtTutionFee.Text.Trim))
                    cmd.Parameters.AddWithValue("@Written", Me.txtWrittenValue.Text.Trim)
                    cmd.Parameters.AddWithValue("@TypeAd", Me.CmbAdmiTyp.Text)
                    cmd.Parameters.AddWithValue("@Type", Me.CombType.Text)
                    cmd.Parameters.AddWithValue("@Employee", CurrentUser)
                    cmd.Parameters.AddWithValue("@RegTu", TxtRe.Text)
                    cmd.ExecuteNonQuery()
                    cmd.CommandText = "Update StdForm Set CH=@CH Where UnivID=" & Me.txtStdIndex.Text
                    cmd.Parameters.Clear()
                    cmd.Parameters.AddWithValue("@CH", 1)
                    cmd.ExecuteNonQuery()
                    ' Trans.Commit()
                    cnn.Close()
                    MsgBox("           تم الحفظ")
                    'printFile(File)
                Else
                    cmd.CommandText = "Delete From StudentsProfilesIndecent Where StudentIndex=N'" & Me.txtStdIndex.Text & "'"
                    cmd.ExecuteNonQuery()
                    cmd.CommandText = "Insert Into StudentsProfilesIndecent (StudentIndex,StudentName,Colleges,Program,TypeAd,Batch,PhoneNo,Address,Nationality,TuitionFees1,Written,ReasonofIndecent,Employee)" & _
                                                           "Values (@StudentIndex,@StudentName,@Colleges,@Program,@TypeAd,@Batch,@PhoneNo,@Address,@Nationality,@TuitionFees1,@Written,@ReasonofIndecent,@Employee) Select SCOPE_IDENTITY()"

                    'Add values
                    'Dim id As Integer
                    'id = (Me.TxtYear.Text) + (Me.txtStdIndex.Text.Trim)
                    cmd.Parameters.AddWithValue("@StudentIndex", (Me.TxtYear.Text) + (Me.txtStdIndex.Text.Trim))
                    cmd.Parameters.AddWithValue("@StudentName", Me.txtStdName.Text.Trim)
                    cmd.Parameters.AddWithValue("@Colleges", Me.CombColleg.Text)
                    cmd.Parameters.AddWithValue("@Program", Me.TxtProgram.Text)
                    cmd.Parameters.AddWithValue("@Batch", Me.TxtYear.Text)
                    cmd.Parameters.AddWithValue("@PhoneNo", Me.txtStdParJop.Text.Trim)
                    cmd.Parameters.AddWithValue("@Address", Me.txtStdAdderess.Text.Trim)
                    cmd.Parameters.AddWithValue("@Nationality", Me.combNationality.Text)
                    cmd.Parameters.AddWithValue("@TuitionFees1", Me.txtTutionFee.Text.Trim)
                    cmd.Parameters.AddWithValue("@Written", Me.txtWrittenValue.Text.Trim)
                    cmd.Parameters.AddWithValue("@TypeAd", Me.CmbAdmiTyp.Text)
                    cmd.Parameters.AddWithValue("@ReasonofIndecent", Me.txtReasonofIndecent.Text)
                    cmd.Parameters.AddWithValue("@Employee", CurrentUser)
                    cmd.ExecuteNonQuery()

                    cmd.CommandText = "Update StdForm Set CH=@CH Where UnivID=" & Me.txtStdIndex.Text
                    cmd.Parameters.Clear()
                    cmd.Parameters.AddWithValue("@CH", 1)
                    cmd.ExecuteNonQuery()
                    cnn.Close()



                    MsgBox("           تم الحفظ")
                End If
                ' FillStudentProfile()
                Profile()
                clear()



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
    Sub clear()
        ErrorProvider1.Clear()
        Me.txtStdIndex.Clear()
        Me.txtStdName.Clear()
        Me.TxtProgram.Clear()
        ' Me.combBatch.SelectedIndex = -1
        Me.combNationality.SelectedIndex = -1
        Me.txtStdParJop.Clear()
        Me.txtStdAdderess.Clear()
        Me.txtTutionFee.Clear()
        Me.txtWrittenValue.Clear()
    End Sub
    Sub FillMedicalExamination()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("select MedicalExamination from MedicalExamination where UniversityID=@UniversityID and UniversityID is not null", cnn)
            Dim reader As SqlDataReader

            cnn.Open()
            cmd.Parameters.AddWithValue("@UniversityID", Me.txtStdIndex.Text)
            reader = cmd.ExecuteReader


            While reader.Read
                Me.CombType.Text = reader.Item("MedicalExamination")
                ' x2 = reader.Item("ReasonofIndecen")
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
    Sub FillStdData()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("select Year,StdFiNaA,StdSNaA,StdThNaA,StdFoNaA,Coleg,Program,Coleg,TypeofAdmission,Type,JobofParent,StudentAddress,Nationality from StdForm where UnivID=@UnivID and UnivID is not null", cnn)
            Dim reader As SqlDataReader

            cnn.Open()
            cmd.Parameters.AddWithValue("@UnivID", Me.txtStdIndex.Text)
            reader = cmd.ExecuteReader
            Dim x, x1, x2, x3, x4 As String
            Dim ss, nn, tt As Integer
            While reader.Read
                x1 = reader.Item("StdFiNaA")
                x2 = reader.Item("StdSNaA")
                x3 = reader.Item("StdThNaA")
                x4 = reader.Item("StdFoNaA")
                x = x1 + " " + x2 + " " + x3 + " " + x4
                Me.txtStdName.Text = x

                Me.TxtProgram.Text = reader.Item("Program")
                Me.txtStdAdderess.Text = reader.Item("StudentAddress")
                Me.txtStdParJop.Text = reader.Item("JobofParent")
                Me.combNationality.Text = reader.Item("Nationality")
                Me.CombColleg.Text = reader.Item("Coleg")



                Me.TxtYear.Text = reader.Item("Year")
                nn = reader.Item("Type")
               
                ss = reader.Item("TypeofAdmission")

            End While
           
            If ss = 0 Then
                Me.CmbAdmiTyp.Text = "قبول عام"
                Me.TxtRe.Text = "120000"
            End If
            If ss = 1 Then

                Me.CmbAdmiTyp.Text = "قبول خاص"

                Me.TxtRe.Text = "200000"

            End If
            If ss = 2 Then
                Me.CmbAdmiTyp.Text = "ابناء عاملين"
                Me.TxtRe.Text = "120000"
            End If
            If ss = 3 Then
                Me.CmbAdmiTyp.Text = "وافدين"
                Me.TxtRe.Text = "120000"
            End If
            If nn = 0 Then
                Me.CombType.Text = "دبلوم"
                Me.TxtRe.Text = "100000"
            Else
                Me.CombType.Text = "بكالوريس"
                ' Me.TxtRe.Text = "120000"
            End If
            fees()
            ' tutfee()
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
    Sub tutfee()
        Try
            Me.Cursor = Cursors.WaitCursor
            Dim cmd As New SqlCommand("select TuitionFees,RegFees From TuitionFees Where Program=N'" & Me.TxtProgram.Text & "'and Type=N'" & Me.CombType.Text & "' and AdmTyp=N '" & Me.CmbAdmiTyp.Text & "'", cnn2)
            Dim reader As SqlDataReader

            cnn2.Open()
            'cmd.Parameters.AddWithValue("@Program", Me.txtStdIndex.Text)
            'cmd.Parameters.AddWithValue("@Type", Me.CombType.Text)
            'cmd.Parameters.AddWithValue("@AdmTyp", Me.CmbAdmiTyp.Text)
            reader = cmd.ExecuteReader


            While reader.Read
                Me.txtTutionFee.Text = reader.Item("TuitionFees")
                Me.TxtRe.Text = reader.Item("RegFees")
            End While

            cnn2.Close()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn2.State = ConnectionState.Open Then
                cnn2.Close()
            End If
            MsgBox(ex.Message)
        End Try
    End Sub
    Sub fees()
        Try

            Dim cmd As New SqlCommand("Select TuitionFees From TuitionFees Where Program=N'" & Me.TxtProgram.Text & "'and Type=N'" & Me.CombType.Text & "'and AdmTyp=N '" & Me.CmbAdmiTyp.Text & "'", cnn2)
            ' and Type=N'" & Me.CombType.Text & "'
            cnn2.Open()
            Me.txtTutionFee.Text = cmd.ExecuteScalar.ToString

            'Me.txtTutionFee.Text = (tutfee).ToString
            cnn2.Close()


        Catch ex As Exception
            If cnn2.State = ConnectionState.Open Then
                cnn2.Close()
            End If

        End Try
    End Sub
    Private Sub StudentProfile_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Me.WindowState = FormWindowState.Maximized

        Me.DateTimePicker1.Value = Now
        dat = Me.DateTimePicker1.Value.Date
        'FillProgram()
        'FillNationality()
        '  FillBatch()
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        clear()
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Me.Close()
    End Sub

    Private Sub btnAdd_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmListBatches
        a.ShowDialog()
        FillBatch()
    End Sub

    Sub FillBatch()
        'Try
        '    Me.Cursor = Cursors.WaitCursor
        '    Me.combBatch.Items.Clear()
        '    Dim cmd As New SqlCommand("select Distinct Batch From AcademicYear Where Batch Is Not Null", cnn)
        '    Dim rdr As SqlDataReader

        '    cnn.Open()
        '    rdr = cmd.ExecuteReader
        '    While rdr.Read
        '        Me.combBatch.Items.Add(rdr.Item(0))
        '    End While
        '    cnn.Close()
        '    Me.Cursor = Cursors.Default
        'Catch ex As Exception
        '    Me.Cursor = Cursors.Default
        '    If cnn.State = ConnectionState.Open Then
        '        cnn.Close()
        '    End If
        '    MsgBox(ex.Message)
        'End Try
    End Sub

    Private Sub Button1_Click_1(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        ' FillStudentProfile()
        Profile()
    End Sub

    Private Sub GridStudProfiles_CellClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles GridStudProfiles.CellClick
        If e.ColumnIndex = 9 Then
            Dim a As New frmStudentProfileUpdate
            a.SNo = CInt(Me.GridStudProfiles.CurrentRow.Cells(0).Value)
            a.ShowDialog()

            FillStudentProfile()
        ElseIf e.ColumnIndex = 10 Then
            If MsgBox("الرجاء تأكيد الحذف", MsgBoxStyle.YesNo) = MsgBoxResult.Yes Then
                Try
                    Dim cmd As New SqlCommand("Delete From StudentsProfiles Where SNo=" & _
                                            Me.GridStudProfiles.Rows(e.RowIndex).Cells(0).Value, cnn)

                    cnn.Open()
                    cmd.ExecuteNonQuery()
                    cnn.Close()

                    MsgBox("تم الحذف !")
                    FillStudentProfile()

                    Me.Cursor = Cursors.Default
                Catch ex As Exception
                    Me.Cursor = Cursors.Default
                    If cnn.State = ConnectionState.Open Then
                        cnn.Close()
                    End If
                    MsgBox(ex.ToString)
                End Try
            End If
        End If

    End Sub


    Private Sub txtTutionFee_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtTutionFee.TextChanged, TxtRe.TextChanged
        Try
            ErrorProvider1.Clear()
            If Me.txtTutionFee.Text.Trim.Length = 0 Then
                Me.txtWrittenValue.Clear()
            ElseIf IsNumeric(Me.txtTutionFee.Text) = False Then
                ErrorProvider1.SetError(Me.txtTutionFee, "يجب إدخال أرقام فقط")
            Else
                Me.txtWrittenValue.Text = ChangeTo(CDbl(Me.txtTutionFee.Text)).ToString
                Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace("جنيها ", "جنيه سوداني ")
                Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace("(", "")
                Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace(")", "")
            End If
        Catch ex As Exception

        End Try
    End Sub
    
    Private Sub btnAddNationality_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmAdd_Nationality
        a.ShowDialog()
        FillNationality()
    End Sub
    Private Sub GridStudProfiles_CellContentClick(ByVal sender As System.Object, ByVal e As System.Windows.Forms.DataGridViewCellEventArgs) Handles GridStudProfiles.CellContentClick
        If e.ColumnIndex = 8 Then
            Try
                Me.Cursor = Cursors.WaitCursor

                Dim cmd As New SqlCommand
                Dim Trans As SqlTransaction

                cnn.Open()
                Trans = cnn.BeginTransaction
                cmd.Transaction = Trans
                cmd.Connection = cnn

                For Each row As DataGridViewRow In Me.GridStudProfiles.Rows
                    cmd.CommandText = "Update StdForm Set " & _
                                            "JobofParent=@JobofParent,ParentPhone=@ParentPhone,StudentPhoneNo=@StudentPhoneNo " & _
                                            "Where UnivID=" & row.Cells(0).Value
                    cmd.Parameters.Clear()
                    cmd.Parameters.AddWithValue("@JobofParent", row.Cells(5).Value)
                    cmd.Parameters.AddWithValue("@ParentPhone", row.Cells(6).Value)
                    cmd.Parameters.AddWithValue("@StudentPhoneNo", row.Cells(7).Value)

                    cmd.ExecuteNonQuery()
                Next

                Trans.Commit()
                cnn.Close()

                MsgBox("Updated Successfully!")

                Profile()

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
   

    Private Sub txtStdIndex_TextChanged(sender As System.Object, e As System.EventArgs) Handles txtStdIndex.TextChanged
        'Me.ErrorProvider1.Clear()
        'If Me.txtStdIndex.Text.Trim.Length = 0 Then
        '    Me.ErrorProvider1.SetError(Me.txtStdIndex, "الرجاءادخال الرقم الجامعي")
        '    Exit Sub
        'ElseIf IsNumeric(Me.txtStdIndex.Text) = False Then
        '    ErrorProvider1.SetError(Me.txtStdIndex, "الرقم الجامعي خاطئ")
        '    Exit Sub
        'Else
        'ValidateUniversityID()
        FillStdData()
        ' fees()
        'End If
    End Sub


    Private Sub Label15_Click(sender As System.Object, e As System.EventArgs) Handles Label15.Click

    End Sub

    Private Sub Button4_Click(sender As System.Object, e As System.EventArgs) Handles Button4.Click
        'SelStudID = ""
        Me.ErrorProvider1.Clear()
        If Me.txtStdIndex.Text.Trim.Length = 0 Then
            Me.ErrorProvider1.SetError(Me.txtStdIndex, "الرجاءادخال الرقم الجامعي")
            Exit Sub
        ElseIf IsNumeric(Me.txtStdIndex.Text) = False Then
            ErrorProvider1.SetError(Me.txtStdIndex, "الرقم الجامعي خاطئ")
            Exit Sub
        Else
            'Dim a As New FrmSerchUNid
            'a.ShowDialog()
            ValidateUniversityID()
            'If SelStudID = "" Then
            '    Exit Sub
            'End If
            'Me.txtStdIndex.Text = SelStudID
            FillStdData()
        End If
        ' FillMedicalExamination()
    End Sub

    Private Sub GroupBox1_Enter(sender As System.Object, e As System.EventArgs) Handles GroupBox1.Enter

    End Sub
End Class